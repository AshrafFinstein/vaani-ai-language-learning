# Agent 11 — QA / Security / Deployment

## Phase
P11-12

## Status
DONE (pending Coordinator gate + commit)

## Completed
### Part A — QA + Security (Phase 11)
- Security/permission/privacy tests:
  - `apps/api/tests/security.test.ts` (25 tests): cross-user AuthZ isolation on the
    highest-risk GET-by-id + mutation endpoints (conversations, meetings, debates,
    photos, flashcard decks) → 404 for non-owners (no data leakage); AuthN on
    protected routes (401 on missing/invalid token); 422 on bad input.
  - `apps/api/tests/audit.test.ts` (5 tests): sensitive meeting actions write a
    reference-only AuditLog row; denied non-owner requests write nothing.
  - Extended `apps/api/tests/meeting.test.ts` with data-deletion tests (recording +
    transcript, ownership + 401), plus an `auditLog` stub in its mock.
- Audit logging: added `AuditLog` Prisma model + migration
  (`prisma/migrations/20260923000000_add_audit_log`) + `lib/audit.ts` (`recordAudit`).
  Wired into meeting service: RECORDING_START, RECORDING_STOP, TRANSCRIPT_ACCESS
  (detail-with-transcript + transcribe), RECORDING_DELETE, TRANSCRIPT_DELETE.
  References only — never secrets/audio/transcript content.
- Data-deletion/retention: verified existing delete endpoints, added auditing +
  ownership assertions; documented retention (`MeetingSettings.retentionDays`) and
  cascade behavior in `docs/SECURITY_ARCHITECTURE.md`.
- E2E: expanded `apps/web/tests/e2e/smoke.spec.ts` into a register → dashboard →
  courses/flashcards/progress happy-path + a bad-credential login check. Kept under
  `npm run e2e` (NOT the default gate).
- Security review: extended `docs/SECURITY_ARCHITECTURE.md` (audit logging, data
  deletion/retention, runtime hardening, expanded checklist).

### Part B — Deployment (Phase 12)
- Dockerfiles: `apps/api/Dockerfile` (multi-stage, tsx runtime, non-root),
  `apps/web/Dockerfile` (Vite build → nginx) + `apps/web/nginx.conf` (SPA fallback +
  `/api` proxy + hardening headers). Root `.dockerignore` (excludes `.env`, etc.).
- Prod compose: `docker-compose.prod.yml` (web + api + db, healthchecks on
  `/api/health`, restart policies, env-file placeholders — no secrets). Dev
  `docker-compose.yml` unchanged.
- CI: `.github/workflows/ci.yml` — gate (install → db:generate → typecheck → lint →
  test → build) on push/PR, Node 20, npm cache; non-blocking E2E job on
  manual/nightly.
- Runtime hardening: `middleware/request-logger.ts` (structured, secret-free, gated
  off under test), `/api/ready` readiness (DB `SELECT 1` → 503), improved graceful
  shutdown in `index.ts`. Error handler verified (no stack leak in prod).
- `.env.example`: added prod deploy vars (POSTGRES_*, WEB_PORT, DATABASE_URL note).
- Added `docs/DEPLOYMENT.md` (build/run, health/ready, pg_dump backup, E2E, CI).
- Added root `npm run e2e` script.

## Gate
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0
- `npm run test` → offline/Mock, green (see report for counts)
- `npm run build` → verify (see report)

## Blockers
None.

## Next Step
Coordinator: independent gate re-run + commit on `feature/phase-11-12-qa-deploy`.
Deferred: live Teams/AVD capture, TLS/ingress, centralized log shipping.
