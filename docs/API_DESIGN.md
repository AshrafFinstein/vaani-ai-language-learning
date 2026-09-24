# API Design — Vaani AI

_Last updated: 2026-09-22. Author: Agent 2 (Architecture)._

The Express REST API (`apps/api`). Layering is strict: **route → controller → service → prisma**;
only services touch Prisma (`CLAUDE.md` §6). All request/response shapes come from `@vaani/types`
(Zod schemas + inferred types) so the client and server contract cannot drift.

## Base & mounting

`createApp()` (`apps/api/src/app.ts`) builds the app: `helmet`, credentialed `cors` (allow-list),
`express.json({ limit: '1mb' })`, `cookie-parser`, then `app.use('/api', apiLimiter, apiRouter)`,
then `notFoundHandler` and `errorHandler`. Module routers are mounted in `routes.ts`:

| Mount | Router | File |
| ----- | ------ | ---- |
| `/api/health` | inline | `routes.ts` |
| `/api/auth` | authRouter | `modules/auth/auth.routes.ts` |
| `/api/user` | userRouter | `modules/user/user.routes.ts` |
| `/api/languages` | languageRouter | `modules/language/language.routes.ts` |
| `/api/chat` | chatRouter | `modules/chat/chat.routes.ts` |
| `/api/practice` | practiceRouter | `modules/practice/practice.routes.ts` |
| `/api/meetings` | meetingRouter | `modules/meeting/meeting.routes.ts` |
| `/api/characters` | characterRouter | `modules/character/character.routes.ts` |
| `/api/debates` | debateRouter | `modules/debate/debate.routes.ts` |
| `/api/photos` | photoRouter | `modules/photo/photo.routes.ts` |

## Response envelope (`@vaani/types/api.ts`)

Every endpoint returns the discriminated `ApiResponse<T>`:

```ts
type ApiResponse<T> = { data: T } | { error: ApiError };
ApiError = { code: ApiErrorCode; message: string; fields?: Record<string, string[]> };
```

`ApiErrorCode` → HTTP status (`HTTP_STATUS_BY_CODE`): BAD_REQUEST 400, UNAUTHORIZED 401,
FORBIDDEN 403, NOT_FOUND 404, CONFLICT 409, VALIDATION 422, RATE_LIMITED 429, INTERNAL 500.

## Error handling

- Domain errors are thrown as `ApiException` (`lib/errors.ts`) carrying an `ApiErrorCode` +
  optional field errors. Factory helpers: `badRequest/unauthorized/forbidden/notFound/conflict/validation`.
- The central `errorHandler` (`middleware/error-handler.ts`) maps `ApiException` → its code,
  `ZodError` → 422 with `fields`, and anything else → 500 "Something went wrong" (**never** leaking
  internals/stack traces in production; logs only when not prod).
- `notFoundHandler` returns 404 for unmatched routes.
- Async controllers are wrapped in `asyncHandler` (`lib/async-handler.ts`) so thrown errors reach
  the handler. `validateBody(schema)` (`middleware/validate.ts`) parses `req.body`, returning 422
  with `fieldErrors` on failure and replacing the body with the typed, parsed result.

## Auth & middleware

- `requireAuth` (`middleware/auth.ts`) reads the `vaani_access` cookie, verifies the JWT, and
  attaches `req.auth = { userId, role }`; missing/invalid → 401. `requireAdmin` gates ADMIN.
- Rate limiting (`middleware/rate-limit.ts`): `authLimiter` (20/15min, relaxed in tests) on all
  `/api/auth/*`; `apiLimiter` (120/min) globally.
- Details in [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md).

---

## Endpoints

Legend — Auth: 🔓 public · 🔒 requires `requireAuth`. DTOs are from `@vaani/types`. Success bodies
are wrapped in `{ data: … }`; the key shown is the payload shape.

### Auth — `/api/auth` (rate-limited; service: `authService`)

| Method | Path | Auth | Request DTO | Response `data` | Notes |
| ------ | ---- | ---- | ----------- | --------------- | ----- |
| POST | `/register` | 🔓 | `RegisterInput` | `{ user: UserDTO }` (201) | Creates user+profile, issues cookies |
| POST | `/login` | 🔓 | `LoginInput` | `{ user: UserDTO }` (200) | Uniform "invalid email or password" |
| POST | `/logout` | 🔓 | — | `{ success: true }` | Revokes refresh session, clears cookies |
| POST | `/refresh` | 🔓 (refresh cookie) | — | `{ user: UserDTO }` | Rotates the refresh session; reusing an old token revokes all sessions |
| POST | `/forgot-password` | 🔓 | `ForgotPasswordInput` | `{ message }` (202) | **Stub** — no email sent yet |

### User — `/api/user` (service: `userService`, `authService.me`)

| Method | Path | Auth | Request | Response `data` |
| ------ | ---- | ---- | ------- | --------------- |
| GET | `/me` | 🔒 | — | `{ user: UserDTO }` |
| PATCH | `/profile` | 🔒 | `UpdateProfileInput` | `{ user: UserDTO }` |

### Languages — `/api/languages`

| Method | Path | Auth | Response `data` |
| ------ | ---- | ---- | --------------- |
| GET | `/` | 🔓 | `LanguageDTO[]` (active languages, name-sorted) |

### Chat — `/api/chat` (all 🔒; service: `chatService`, AI via `getAIProvider`)

| Method | Path | Request DTO | Response `data` | Notes |
| ------ | ---- | ----------- | --------------- | ----- |
| GET | `/history` | — | `{ conversations: ConversationSummaryDTO[] }` | Declared before `/:id` |
| POST | `/` | `StartConversationInput` | `{ conversation: ConversationDTO }` (201) | Seeds opener for scenario modes; records a `PracticeSession` |
| GET | `/:id` | — | `{ conversation: ConversationDetailDTO }` | Owner-scoped |
| POST | `/:id/messages` | `SendMessageInput` | `{ userMessage, assistantMessage }` (201) | Non-streaming |
| POST | `/:id/stream` | `SendMessageInput` | **SSE** stream of `ChatStreamEvent` | `meta`→`delta`…→`done`/`error` |
| POST | `/:id/feedback` | — | `{ feedback: AIFeedback }` | Structured tutor feedback |

### Practice — `/api/practice` (🔒; service: `practiceService`)

| Method | Path | Request DTO | Response `data` |
| ------ | ---- | ----------- | --------------- |
| POST | `/sentence` | `SubmitSentenceInput` | `{ evaluation: SentenceEvaluation }` |

### Meetings — `/api/meetings` (all 🔒; service: `meetingService`, providers from `@vaani/meeting`)

| Method | Path | Request DTO | Response `data` | Notes |
| ------ | ---- | ----------- | --------------- | ----- |
| GET | `/settings` | — | `{ settings: MeetingPrivacySettings }` | Declared before `/:id` |
| PATCH | `/settings` | `UpdatePrivacySettingsInput` | `{ settings }` | Consent/retention defaults |
| GET | `/` | — | `{ meetings: MeetingSummaryListDTO[] }` | |
| POST | `/` | `ScheduleMeetingInput` | `{ meeting: MeetingDTO }` (201) | Creates IDLE recording, no consent |
| GET | `/:id` | — | `{ meeting: MeetingDetailDTO }` | Includes transcript/summary/items |
| POST | `/:id/recording/start` | `StartRecordingInput` | `{ recording: RecordingSessionDTO }` | Requires `recordingConsent: true` (Zod literal + guard → 403) |
| POST | `/:id/recording/control` | `RecordingControlInput` | `{ recording }` | PAUSE/RESUME/STOP; STOP triggers mock analysis |
| DELETE | `/:id/recording` | — | `{ deleted: true }` | Privacy control |
| DELETE | `/:id/transcript` | — | `{ deleted: true }` | Privacy control |

### Characters — `/api/characters` (🔒; service: `characterService` → `chatService`)

| Method | Path | Request DTO | Response `data` |
| ------ | ---- | ----------- | --------------- |
| GET | `/` | — | `{ characters: CharacterDTO[] }` |
| POST | `/` | `StartCharacterChatInput` | `{ conversation: ConversationDTO }` (201) |

### Debates — `/api/debates` (all 🔒; service: `debateService`)

| Method | Path | Request DTO | Response `data` |
| ------ | ---- | ----------- | --------------- |
| GET | `/` | — | `{ debates: DebateSummaryDTO[] }` |
| POST | `/` | `StartDebateInput` | `{ debate: DebateDTO }` (201) |
| GET | `/:id` | — | `{ debate: DebateDetailDTO }` |
| POST | `/:id/turns` | `DebateTurnInput` | `{ userMessage, assistantMessage }` (201) |
| POST | `/:id/feedback` | — | `{ feedback: DebateFeedback }` |

### Photos — `/api/photos` (all 🔒; service: `photoService`)

| Method | Path | Request DTO | Response `data` |
| ------ | ---- | ----------- | --------------- |
| GET | `/` | — | `{ sessions: PhotoSessionDTO[] }` |
| POST | `/` | `StartPhotoSessionInput` | `{ session: PhotoSessionDTO }` (201) |
| GET | `/:id` | — | `{ session: PhotoSessionDetailDTO }` |
| POST | `/:id/messages` | `PhotoMessageInput` | `{ userMessage, assistantMessage }` (201) |

### Health

`GET /api/health` → `{ data: { status: 'ok' } }` (unauthenticated).

## Route-ordering note
Literal sub-routes are declared **before** `/:id` params so they are not captured as ids:
`/chat/history` before `/chat/:id`, and `/meetings/settings` before `/meetings/:id`.

## Related docs
- [`AI_ARCHITECTURE.md`](./AI_ARCHITECTURE.md) · [`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md) ·
  [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md)
