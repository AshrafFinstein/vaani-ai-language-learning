# Product Features — Vaani AI

_Last updated: 2026-09-22. Author: Agent 1 (Product Research)._

The catalogue of Vaani AI features, as **actually built** in the repo plus what is **planned**.
Each feature maps to its master-plan phase (see [`PHASE_MAP.md`](./PHASE_MAP.md)), its navigation
group (`apps/web/src/config/nav.ts`), and its routes (`apps/web/src/App.tsx`). "Mock" means the
behaviour is deterministic/offline today and a real integration is deferred to a later phase.

Legend: ✅ built · 🟡 built as mock/prototype · ⏳ planned (nav present, renders "Coming soon") · ❌ not started.

---

## 1. Authentication & account — ✅ (P3)

| Capability | Status | Where |
| ---------- | ------ | ----- |
| Register (name/email/password, password-strength rules) | ✅ | `/register`, `POST /api/auth/register` |
| Login | ✅ | `/login`, `POST /api/auth/login` |
| Logout (revokes refresh session) | ✅ | `POST /api/auth/logout` |
| Session hydration on load | ✅ | `GET /api/user/me` |
| Refresh-token rotation | ✅ | `POST /api/auth/refresh` |
| Forgot password | 🟡 stub (returns 202, no email yet) | `/forgot-password`, `POST /api/auth/forgot-password` |
| Profile / settings (name, learning language, level, daily goal, theme) | ✅ | `/app/profile`, `PATCH /api/user/profile` |
| Google OAuth, email verification, password reset | ❌ stubbed/deferred | — |

Auth uses bcrypt hashing + JWT access token and a persisted, hashed refresh token, both delivered
as httpOnly cookies. See [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md).

## 2. Dashboard — ✅ shell, 🟡 data (P3)

- Nav group **Overview** → `/app/dashboard`.
- Renders streak, level, XP-to-next, daily-goal ring, weekly-minutes chart, per-skill scores, and
  quick-action mode launcher. **All numbers are mock today** (`apps/web/src/mock/dashboard.ts`);
  real figures arrive with the Progress/analytics phase (P10).

## 3. AI Chat — ✅ (P4)

- Nav group **Practice** → `/app/chat`, `/app/chat/:id`.
- Pick a topic (9 topics in `CHAT_TOPICS`) and level, then converse with the "Vaani" tutor.
- Streaming replies via Server-Sent Events; full history persisted (`Conversation` +
  `ConversationMessage`); history list, resume by id.
- On-demand structured feedback (`AIFeedback`: corrections, vocabulary, pronunciation, 3 scores).
- Backed by the `@vaani/ai` provider abstraction (Mock by default, OpenAI-compatible optional).

## 4. Roleplay & Dialogue — ✅ (P5)

- Nav group **Practice** → `/app/roleplay(/:id)`, `/app/dialogue(/:id)`.
- **Roleplay:** learner and AI play roles in an authored scenario (6 scenarios: restaurant, job
  interview, airport, hotel, doctor, making friends — `ROLEPLAY_SCENARIOS`). The AI stays in
  character via `buildRoleplayPrompt`.
- **Dialogue:** short guided, goal-oriented exchanges (3 scenarios: coffee shop, directions,
  buying clothes — `DIALOGUE_SCENARIOS`) via `buildDialoguePrompt`.
- Both reuse the Chat conversation/streaming/feedback pipeline (`ConversationMode` = `ROLEPLAY` /
  `DIALOGUE` / `SCENARIO`). Scenario content is original Vaani AI data in `@vaani/types/scenario.ts`.

## 5. Learning modes: Word & Sentence — ✅ core (P6)

- Nav group **Practice** → `/app/word`, `/app/sentence`.
- **Word mode:** flashcard decks (seeded per language, `getWordDeck`; English + Spanish decks,
  English fallback). Review state is client-side today; user-specific SRS persistence is deferred
  to the Vocabulary phase.
- **Sentence mode:** learner answers an open prompt (8 prompts in `SENTENCE_PROMPTS`); the AI
  returns a structured `SentenceEvaluation` (corrected + better version + explanation + scores) via
  `POST /api/practice/sentence`.

## 6. Voice / Call — 🟡 (P7A)

- Nav group **Practice** → `/app/call`.
- Audio-only conversation: browser **Web Speech API** for speech-to-text
  (`useSpeechRecognition`) and speech synthesis for text-to-speech (`useSpeechSynthesis`), looped
  into the Chat send endpoint. Mic mute, call timer, live transcript panel, graceful "unsupported
  browser" state.
- STT/TTS **provider** abstractions exist in `@vaani/ai` but only the Mock server-side providers
  are wired; real server-side STT/TTS and device (mic/speaker) pickers are deferred to a real-
  capture phase. The current Call feature runs entirely in the browser's speech engine.

## 7. Meeting Intelligence — 🟡 mock (P7B)

- Nav group **Meetings** → `/app/meetings`, `/app/meetings/schedule`, `/app/meetings/:id`.
- Schedule a Teams/AVD/Other meeting with participants; consent-gated recording **state machine**
  (IDLE → RECORDING → PAUSED → STOPPED); on STOP a **mock** transcript is generated and analysed
  into a summary, decisions, and action items; per-user privacy settings (consent defaults,
  auto-record/transcribe, retention days); delete-recording / delete-transcript controls.
- **No real audio/video capture** happens — capture is deferred pending environment validation.
  The analyzer never invents participants/owners/deadlines (`Unassigned` / `Not specified`
  sentinels). See [`MEETING_ARCHITECTURE.md`](./MEETING_ARCHITECTURE.md) and
  [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md).

## 8. Advanced AI modes: Characters, Debate, Photo — ✅ (P8, 🟡 vision)

- Nav group **Practice**.
- **Characters** → `/app/characters(/:id)`: chat with a seeded persona (5 seeded: barista,
  interviewer, travel guide, shopkeeper, doctor). Reuses the Chat pipeline (`ConversationMode` =
  `CHARACTER`); persona drives the system prompt via `buildCharacterPrompt`. `AICharacter` table.
- **Debate** → `/app/debate(/:id)`: learner argues a side of a motion (6 topics in
  `DEBATE_TOPICS`); the AI argues the opposite (`buildDebatePrompt`); structured `DebateFeedback`
  (argument-quality/persuasiveness/overall scores). `Debate` + `DebateMessage` tables.
- **Photo** → `/app/photo(/:id)`: learner supplies an image (data-URL or URL); a **mock** vision
  method (`describeImage`) produces a description; the AI converses about it (`buildPhotoPrompt`).
  No real image analysis. `PhotoSession` + `PhotoMessage` tables.

## 9. Courses / Vocabulary / Grammar / Pronunciation — ⏳ planned (P9)

- Nav group **Learn** → `/app/courses`, `/app/vocabulary`, `/app/grammar`, `/app/pronunciation`.
- All render the shared **Coming soon** page today (listed in `App.tsx` `COMING_SOON`). Course/
  lesson/exercise/vocabulary/grammar Prisma models are intentionally **not** created yet.

## 10. Progress / analytics — ⏳ planned (P10)

- Nav group **Progress** → `/app/progress` (Statistics), `/app/history`, `/app/achievements`.
- All render **Coming soon** today. The dashboard's numbers are mock until this phase adds real
  analytics endpoints that aggregate `PracticeSession` rows and AI feedback. See Pattern 4 in
  [`REFERENCE_ANALYSIS.md`](./REFERENCE_ANALYSIS.md).

## 11. Subscriptions / usage limits — ❌ deferred (optional)

- Nav entry **Subscription** exists in `App.tsx` `COMING_SOON` (no nav-group link). Not in the
  master plan; treated as optional/deferred (`PHASE_MAP.md` note).

## 12. Languages — ✅ (P3)

- 11 launch languages seeded: English, Spanish, French, German, Italian, Portuguese, Japanese,
  Korean, Chinese, Hindi, Tamil (`prisma/seed.ts`). `GET /api/languages` lists active ones; the
  language switcher (`LanguageSwitcher.tsx`) and profile set the learning language.

---

## Feature → phase → nav/route summary

| Feature | Phase | Nav group | Primary route(s) | Status |
| ------- | ----- | --------- | ---------------- | ------ |
| Auth & profile | P3 | Account | `/login`, `/register`, `/app/profile` | ✅ (forgot-pw stub) |
| Dashboard | P3 | Overview | `/app/dashboard` | ✅ shell / 🟡 mock data |
| AI Chat | P4 | Practice | `/app/chat` | ✅ |
| Roleplay | P5 | Practice | `/app/roleplay` | ✅ |
| Dialogue | P6 | Practice | `/app/dialogue` | ✅ |
| Sentence | P6 | Practice | `/app/sentence` | ✅ |
| Word | P6 | Practice | `/app/word` | ✅ (client-side review) |
| Call (voice) | P7A | Practice | `/app/call` | 🟡 browser STT/TTS |
| Meetings | P7B | Meetings | `/app/meetings` | 🟡 mock pipeline |
| Characters | P8 | Practice | `/app/characters` | ✅ |
| Debate | P8 | Practice | `/app/debate` | ✅ |
| Photo | P8 | Practice | `/app/photo` | 🟡 mock vision |
| Courses/Vocab/Grammar/Pronunciation | P9 | Learn | `/app/courses`, … | ⏳ Coming soon |
| Progress/History/Achievements | P10 | Progress | `/app/progress`, … | ⏳ Coming soon |
| Subscription | (opt) | — | `/app/subscription` | ⏳ Coming soon |
