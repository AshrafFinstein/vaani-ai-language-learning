# Security Architecture — Vaani AI

_Last updated: 2026-09-23. Author: Agent 2 (Architecture)._

Security posture of the API and web app, plus the Meeting Intelligence privacy/consent model.

## Authentication

- **Password hashing:** `bcryptjs` at 12 rounds (`auth.service.ts` `BCRYPT_ROUNDS`). Only the hash
  is stored (`User.passwordHash`); it is never included in any DTO (`UserDTO` omits it).
- **Tokens (`lib/tokens.ts`):**
  - **Access token** — a short-lived JWT (`JWT_ACCESS_TTL`, default `15m`) signed with `JWT_SECRET`
    (HS256), payload `{ sub: userId, role }`.
  - **Refresh token** — an opaque 48-byte random value returned to the client, of which only the
    **SHA-256 hash** is persisted (`Session.refreshTokenHash`, unique). A DB leak therefore cannot
    reuse tokens. Default lifetime `JWT_REFRESH_TTL_DAYS = 30`.
- **Cookies (`lib/cookies.ts`):** both tokens are delivered as cookies that are `httpOnly`
  (invisible to JS → mitigates XSS token theft), `SameSite=Lax` (CSRF mitigation), `path=/`, and
  `secure` in production. Cookie names: `vaani_access`, `vaani_refresh`.
- **Session lifecycle (`auth.service.ts`):** register/login create a `Session` row and set cookies.
  `logout` marks the matching session `revokedAt` and clears cookies. `refresh` **rotates**: the
  used session is revoked and a fresh one issued; expired/revoked/unknown refresh tokens → 401.
  Rotation is atomic (a conditional `updateMany … revokedAt: null`), so two concurrent refreshes
  with one token cannot both mint sessions. **Reuse detection:** presenting a token that was rotated
  more than 60 s ago (`REFRESH_REUSE_GRACE_MS`) is treated as theft and revokes *all* of the user's
  live sessions; within the grace window it is a benign multi-tab race and only that request fails.
- **Client refresh (`apps/web/src/lib/api.ts`):** on a 401 from any non-`/api/auth/*` call the
  client calls `/api/auth/refresh` once (a single shared in-flight promise for concurrent 401s) and
  retries the request; if the refresh fails it clears the auth store, which routes to login.
- **Guard (`middleware/auth.ts`):** `requireAuth` verifies the access cookie and attaches
  `req.auth = { userId, role }`; missing/invalid/expired → 401 with a generic message. `requireAdmin`
  gates ADMIN-only routes.
- **Enumeration resistance:** login returns a uniform "Invalid email or password" for both unknown
  email and wrong password, and runs a bcrypt compare against a dummy hash for unknown emails so
  response timing does not reveal which accounts exist; `forgot-password` always returns 202 regardless of whether the email
  exists (the email-send itself is a stub today).
- **Deferred:** Google OAuth, email verification, and password reset are stubbed with TODOs.

## HTTP hardening & middleware (`app.ts`)

- **`helmet()`** sets secure response headers; `x-powered-by` is disabled.
- **CORS** is an **allow-list**: `corsOrigins` is parsed from `CORS_ORIGIN` (comma-separated,
  default `http://localhost:5173`) with `credentials: true` so cookies flow only to permitted
  origins.
- **Body limit:** `express.json({ limit: '1mb' })` caps request size. (Photo images are additionally
  capped at ~2 MB by the `StartPhotoSessionInput` Zod schema.)
- **Rate limiting (`middleware/rate-limit.ts`):** `authLimiter` — 20 requests / 15 min on all
  `/api/auth/*` (blunts credential stuffing / brute force); `apiLimiter` — 120 / min globally. Both
  are relaxed under `NODE_ENV=test`. Limit responses use the `RATE_LIMITED` envelope.
- **Input validation:** `validateBody(schema)` runs the `@vaani/types` Zod schema on `req.body`,
  returning `422 VALIDATION` with per-field errors, and replaces the body with the parsed, typed
  value. Password strength is enforced in `RegisterInput` (≥8 chars, upper+lower+digit).

## Error handling & information disclosure

The central `errorHandler` (`middleware/error-handler.ts`) converts every thrown error into the
canonical `ApiError` envelope and maps it to the right HTTP status. Unknown errors become a generic
`500 "Something went wrong"`; stack traces are logged only when **not** in production, so no
internals/secrets leak to clients. `notFoundHandler` returns a clean 404.

## Data access & SQL-injection safety

All database access is through **Prisma** with parameterised queries — user input is never
interpolated into raw SQL. Layering is enforced (`route → controller → service → prisma`): only
services touch Prisma. Ownership is checked on every scoped read/write (e.g.
`getOwnedMeeting`/`getOwnedConversation` filter by `userId`, returning 404 otherwise), so users
cannot access another user's resources by guessing ids.

## Secrets & configuration (`env.ts`)

Env is validated with Zod at boot and **fails fast** on misconfiguration. `JWT_SECRET` must be ≥16
chars. Secrets (`JWT_SECRET`, `OPENAI_API_KEY`) live only in the backend environment; `.env` is not
committed (`.env.example` documents the shape). **AI keys never reach the browser** — the web app
only calls our REST API (see [`AI_ARCHITECTURE.md`](./AI_ARCHITECTURE.md)).

## Meeting Intelligence — consent & privacy model (P7B)

This module is built to be privacy-first and **consent-gated**, per `CLAUDE.md` §13–15:

- **Consent-gated recording.** A `RecordingSession` is created in `IDLE` with `recordingConsent =
  false` at schedule time. Starting a recording requires explicit consent: `StartRecordingInput`
  demands `recordingConsent: z.literal(true)` (422 otherwise), and the service **additionally**
  rejects any attempt to enter `RECORDING` without it (403). Consent is captured at start, not
  buried in scheduling.
- **User-visible, never covert.** Recording is modelled as an explicit state machine
  (IDLE→RECORDING→PAUSED→STOPPED) surfaced to the UI (`RecordingControls`, `RecordingSessionDTO`),
  with a `PrivacyPanel`. **No real audio/video capture and no hidden desktop recorder exist** —
  capture is deferred pending environment validation. Today the pipeline is entirely mock.
- **No fabricated data.** The analyzer never invents participants, owners, deadlines, decisions, or
  action items. Owners default to `Unassigned` and due dates to `Not specified` when the transcript
  does not support them; decisions/action-items derive only from explicit transcript cue markers.
  These sentinels are enforced both in `@vaani/meeting` and when persisting (`meeting.service.ts`).
- **Per-user privacy settings.** `MeetingSettings` stores consent defaults, auto-record/transcribe
  toggles, and a **retention window** (`retentionDays`, default 30, validated 1–3650) via
  `GET/PATCH /api/meetings/settings`.
- **Deletion controls.** `DELETE /api/meetings/:id/recording` and `DELETE /api/meetings/:id/transcript`
  let a user remove stored recording-session metadata and the transcript (+ its segments) for a
  meeting they own. Both re-check ownership (`getOwnedMeeting` → 404 otherwise) and write an audit row.

See [`MEETING_ARCHITECTURE.md`](./MEETING_ARCHITECTURE.md) for the full module design.

## Audit logging (Phase 11)

Sensitive actions leave an append-only trail in the `AuditLog` model (`userId`, `action`,
`targetType`, `targetId`, optional small `metadata`, `createdAt`). The `recordAudit` helper
(`lib/audit.ts`) is wired into the meeting service at: **recording start** (`RECORDING_START`),
**recording stop** (`RECORDING_STOP`, with a `durationSeconds` reference), **transcript access**
(`TRANSCRIPT_ACCESS` on detail-with-transcript and on `transcribe`), and **deletion**
(`RECORDING_DELETE`, `TRANSCRIPT_DELETE`). We log **references only** — never secrets, tokens,
audio, or transcript content (`CLAUDE.md` §10). Auditing is best-effort: a write failure never
breaks the underlying action, and audit rows are only written **after** the ownership check
passes, so a denied (404) request records nothing. Rows cascade-delete with the owning user.

## Data deletion & retention

- **On-demand deletion.** Users delete their recording metadata and transcripts via the two
  ownership-checked, audited `DELETE` endpoints above; segments cascade with the transcript.
- **Retention window.** `MeetingSettings.retentionDays` (default 30, validated 1–3650) expresses
  the per-user retention preference for meeting artifacts.
- **Cascade on account/resource removal.** All user-scoped models set `onDelete: Cascade` on the
  `User`/parent relation, so removing a user (or a meeting) removes their conversations, meetings,
  recordings, transcripts, decks, reviews, activity, achievements, and audit rows.
- **Backups.** Operational backup/restore via `pg_dump`/`pg_restore` is documented in
  [`DEPLOYMENT.md`](./DEPLOYMENT.md); scheduling + retention of backups is an ops policy.

## Runtime hardening & operations (Phase 12)

- **Structured request logging** (`middleware/request-logger.ts`): one line per request
  (method, path, status, duration); JSON in prod, skipped for `/health`, `/ready`, and under test.
  It logs no bodies, cookies, or tokens.
- **Liveness/readiness**: `GET /api/health` (dependency-free) and `GET /api/ready` (`SELECT 1`,
  returns 503 when the DB is down) back the container/orchestrator probes.
- **Graceful shutdown** (`index.ts`): drains in-flight requests on `SIGINT`/`SIGTERM`, then
  disconnects Prisma.
- **Images carry no secrets**: multi-stage Dockerfiles + `.dockerignore` exclude `.env`; all
  config is injected via env at runtime (`docker-compose.prod.yml` uses env-file placeholders).

## Summary checklist

| Control | Status |
| ------- | ------ |
| bcrypt password hashing (12 rounds) | ✅ |
| JWT access + hashed rotating refresh sessions (atomic, reuse detection) | ✅ |
| Client auto-refresh of expired access tokens | ✅ |
| Login timing does not leak account existence | ✅ |
| httpOnly / SameSite=Lax / secure-in-prod cookies | ✅ |
| helmet secure headers, x-powered-by off | ✅ |
| CORS allow-list, credentialed | ✅ |
| Rate limiting (auth + global) | ✅ |
| Zod input validation, typed body | ✅ |
| Prisma parameterised queries (SQLi-safe) | ✅ |
| Ownership checks on scoped resources | ✅ |
| No stack-trace/secret leakage in prod | ✅ |
| Env validated at boot, fail-fast | ✅ |
| AI keys backend-only | ✅ |
| Meeting consent-gating + retention + delete | ✅ |
| Audit logging of sensitive actions (references only) | ✅ |
| Data-deletion endpoints (recording/transcript), ownership-checked | ✅ |
| Cascade delete of user-scoped data | ✅ |
| Structured request logging (no secrets/bodies) | ✅ |
| Liveness `/health` + readiness `/ready` | ✅ |
| Graceful shutdown | ✅ |
| No secrets in Docker images / build context | ✅ |
| Cross-user AuthZ isolation test-covered (chat, meetings, debates, photos, decks) | ✅ |
| CSRF token (double-submit) | ⏳ relies on SameSite=Lax today |
| OAuth / email verification / password reset | ⏳ stubbed |
| Live Teams/AVD capture | ⏳ deferred (CLAUDE.md §14) |
| TLS termination / ingress | ⏳ front with a TLS proxy in prod |

## Related docs
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`API_DESIGN.md`](./API_DESIGN.md) ·
  [`AI_ARCHITECTURE.md`](./AI_ARCHITECTURE.md) · [`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md)
