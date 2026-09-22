# Agent 8 — Advanced AI Modes

## Phase
P8

## Status
DONE (gate green: typecheck + lint + test all exit 0)

## Completed
- Character conversations: `AICharacter` Prisma model + seed (5 personas), `/api/characters`
  (list + start), reuses the Conversation/streaming/feedback pipeline via new
  `ConversationMode.CHARACTER` + `characterId` FK. Web: Characters picker + reuse ConversationView.
- Debate: `Debate` + `DebateMessage` models, `DebateSide`/`DebateStatus` enums, static topics in
  `@vaani/types`, `/api/debates` (start, detail, turns, feedback → closes). Structured
  `DebateFeedback` via new `AIProvider.analyzeDebate`. Web: DebatePicker + DebateRoom + feedback panel.
- Photo conversation: `PhotoSession` + `PhotoMessage` models, `/api/photos` (start, detail,
  messages). New MOCK vision `AIProvider.describeImage` (deterministic, hash-based, no network).
  Accepts data-URL upload OR image URL (stored as-is, no upload pipeline). Web: PhotoPicker
  (file→base64 or URL) + PhotoRoom.
- Scenario mode: added `ConversationMode.SCENARIO` reusing the Phase 5 roleplay scenario content
  + `buildRoleplayPrompt` (no duplication) — open scenario chats route through the chat pipeline.
- Prompts added to `@vaani/ai`: buildCharacterPrompt, buildDebatePrompt, buildDebateFeedbackPrompt,
  buildPhotoPrompt (+ parseDebateFeedback). MockAIProvider + OpenAIProvider both implement the two
  new interface methods.
- Migration `20260922080000_add_advanced_modes`; `npm run db:generate` run.
- Web: routes registered in App.tsx (removed from COMING_SOON), nav Photo/Debate/Characters ready.
- Tests: api supertest (character, debate turn+feedback, photo mock-vision); web RTL (CharacterPicker,
  DebatePicker); @vaani/ai unit tests for describeImage determinism + analyzeDebate + prompts.

## Current Task
—

## Blockers
None.

## Deferred
- Real vision / real image analysis (mock only, behind `describeImage`).
- Real image storage / heavy upload pipeline (data-URL / URL stored as-is).
- Debate streaming (turns are non-streaming request/response; chat SSE remains for chat/character).

## Next Step
Coordinator review + integrate into develop.
