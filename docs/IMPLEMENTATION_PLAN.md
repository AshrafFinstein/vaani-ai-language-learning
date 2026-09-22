# Vaani AI — Implementation Plan

The product is built **incrementally**. Each phase must build, type-check, and pass tests before
the next begins. Do not proceed to a new phase until explicitly approved.

## Phase status

| Phase | Scope                                                    | Status        |
| ----- | -------------------------------------------------------- | ------------- |
| 1     | Setup · tooling · DB · **auth** · dashboard shell        | ✅ In progress |
| 2     | Dashboard data · navigation · profile · language select  | ⏳ Planned      |
| 3     | AI Chat · streaming · conversation history               | ⏳ Planned      |
| 4     | Roleplay · Sentence · Dialogue · Word modes              | ⏳ Planned      |
| 5     | Voice / Call · speech-to-text · text-to-speech           | ⏳ Planned      |
| 6     | Photo · Debate · Characters                              | ⏳ Planned      |
| 7     | Courses · Vocabulary · Grammar                           | ⏳ Planned      |
| 8     | Progress · analytics · achievements                      | ⏳ Planned      |
| 9     | Subscriptions · usage limits · premium features          | ⏳ Planned      |
| 10    | Testing · security · performance · deployment            | ⏳ Planned      |

---

## Phase 1 — delivered

**Tooling & monorepo**
- npm workspaces (`apps/*`, `packages/*`), strict TypeScript base config, ESLint (flat) + Prettier.
- `docker-compose.yml` (Postgres 16 on host port 5433), `.env.example`, README, architecture docs.

**Shared packages**
- `@vaani/types` — Zod schemas + inferred types: auth DTOs, `ApiResponse` envelope, AI feedback schema.
- `@vaani/ai` — `AIProvider` / `SpeechToTextProvider` / `TextToSpeechProvider` interfaces, `Mock*`
  implementations, `OpenAIProvider` stub, and an env-driven factory.
- `@vaani/config` — shared tsconfig / eslint presets.

**Database**
- Prisma models: `User`, `Profile`, `Language`, `UserLanguage`, `Session` (+ enums). Seed inserts the
  11 launch languages.

**API (`@vaani/api`)**
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/user/me`,
  `POST /api/auth/forgot-password` (stub), `GET /api/languages`.
- bcrypt, JWT httpOnly cookies, refresh sessions, Zod validation, rate limiting, helmet, CORS,
  central error handler.

**Web (`@vaani/web`)**
- Vite/React/TS, Tailwind (indigo→violet), shadcn primitives, dark/light theme, React Router,
  TanStack Query, Zustand auth store.
- Public: Landing, Login, Register, Forgot-password (+ placeholder Features/Pricing/About/Terms/Privacy).
- Authenticated shell: grouped Sidebar + TopBar, `<ProtectedRoute>`, mock-data Dashboard, and a
  shared "Coming soon" page for not-yet-built routes.

**Tests**
- API: Vitest + supertest (register/login/me/logout, 422 validation, 409 duplicate).
- Web: Vitest + RTL (login form, dashboard render, protected-route redirect).
- Playwright config + smoke scaffold (full journey lands in a later phase).

---

## Future phase notes (models introduced when their phase begins)

- **Phase 3:** `Conversation`, `ConversationMessage`, `PracticeSession`.
- **Phase 4:** `Roleplay`, `RoleplaySession`.
- **Phase 6:** `AICharacter`, `Debate`, `PhotoSession`, `AudioRecording`.
- **Phase 7:** `Course`, `CourseModule`, `Lesson`, `Exercise`, `Vocabulary`, `UserVocabulary`, `GrammarTopic`.
- **Phase 8:** `Progress`, `Achievement`.
- **Phase 9:** `Subscription`, `Usage`.

Adding these early would create unused tables; each is added with its feature to keep migrations meaningful.
