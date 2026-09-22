# AI Architecture — Vaani AI

_Last updated: 2026-09-22. Author: Agent 2 (Architecture)._

All AI and speech capability is reached **only** through the `@vaani/ai` (and `@vaani/meeting`)
provider abstractions. Feature code depends on interfaces, never a vendor SDK, so the underlying
provider is swappable via configuration. **AI keys live only on the backend and are never shipped
to the browser** (`CLAUDE.md` §7).

## Design goals

1. **Vendor independence** — feature code imports interfaces (`AIProvider`, `SpeechToTextProvider`,
   `TextToSpeechProvider`), not concrete SDKs.
2. **Deterministic offline default** — the Mock provider needs no key or network, so dev and tests
   are reproducible.
3. **Validated structured output** — every structured result (feedback, sentence eval, debate
   feedback) is parsed through a Zod schema before it is trusted or persisted.
4. **Keys on the backend only** — providers are constructed server-side (`apps/api/src/lib/ai.ts`);
   the browser calls our REST API, never a model vendor.

## The `AIProvider` interface (`packages/ai/src/types.ts`)

```
interface AIProvider {
  readonly name: string;
  chat(messages, options?): Promise<ChatResult>                       // single-shot reply
  streamChat(messages, options?): AsyncIterable<string>               // text deltas (SSE)
  analyze(messages, options?): Promise<AIFeedback>                    // schema-validated tutor feedback
  evaluateSentence(prompt, answer, options?): Promise<SentenceEvaluation>
  describeImage(image, options?): Promise<ImageDescriptionResult>     // Photo mode (mock vision)
  analyzeDebate(motion, userSide, messages, options?): Promise<DebateFeedback>
}
```

`ChatOptions` carries `level`, `languageCode`, `languageName`, `topic`, and an optional
`systemPrompt` override (roleplay/dialogue/character/scenario modes set this verbatim).

Speech interfaces:
```
SpeechToTextProvider.transcribe(audio: ArrayBuffer, languageCode?) → { text, confidence }
TextToSpeechProvider.synthesize(text, languageCode?) → { audio: ArrayBuffer, mimeType }
```

## Implementations

```
AIProvider                 SpeechToTextProvider    TextToSpeechProvider
├── MockAIProvider  ✅       └── MockSttProvider ✅   └── MockTtsProvider ✅
└── OpenAIProvider  ✅
```

### MockAIProvider (`mock.ts`) — default
Deterministic, offline, no key/network. `chat`/`streamChat` produce plausible tutor replies (stream
emits word-by-word). `analyze` applies a small heuristic (e.g. capitalisation correction) and
returns a schema-valid `AIFeedback`. `evaluateSentence` checks capitalisation/punctuation.
`describeImage` picks a stable scene from a small catalogue by **hashing the image reference** (same
image → same description — important for reproducible tests; **no** real image analysis or network).
`analyzeDebate` scores based on turn count / average words. `MockStt`/`MockTts` return a placeholder
transcription and an empty audio buffer.

### OpenAIProvider (`openai.ts`) — optional, OpenAI-compatible
Works against any `/chat/completions` endpoint (OpenAI, Azure OpenAI, local gateways) via
`baseUrl`; default model `gpt-4o-mini`. **Requires an API key** and throws at construction if
missing. `streamChat` parses SSE frames into deltas. Structured methods request
`response_format: json_object`, then defensively parse (strip code fences, fall back to the first
`{…}` block) and **validate through the Zod schema** before returning (`parseFeedback`,
`parseDebateFeedback`, `parseJson`). `describeImage` uses the multimodal `image_url` message format
(accepts data-URLs). Because it implements `AIProvider`, swapping vendors is a config change only.

## The factory (`factory.ts`)

```
createAIProvider({ provider, openaiApiKey, openaiBaseUrl }): AIProvider
  'openai' → new OpenAIProvider({ apiKey, baseUrl })
  'mock' | default → new MockAIProvider()
createSttProvider(env) → MockSttProvider   (only mock until the real-capture phase)
createTtsProvider(env) → MockTtsProvider
```

Env-driven: the API reads `AI_PROVIDER` (default `mock`), `OPENAI_API_KEY`, `OPENAI_BASE_URL`
(`apps/api/src/env.ts`) and constructs the provider **lazily** through
`getAIProvider()` (`apps/api/src/lib/ai.ts`) — so the key never needs to exist at import time in
tests. The provider is a singleton per process.

## Prompt builders (`prompt.ts`)

Pure functions that assemble system prompts; both Mock and OpenAI share them:
- `buildSystemPrompt` — the "Vaani" tutor: reply in the target language, keep it short, do **not**
  correct inline (corrections come via `analyze`), end with a follow-up question. Adapts tone to a
  per-level `LEVEL_GUIDANCE` map (CEFR-aligned A1→C1+).
- `buildFeedbackPrompt` / `buildSentenceEvalPrompt` / `buildDebateFeedbackPrompt` — instruct the
  model to return **only** JSON with exact keys (still Zod-validated on return).
- `buildRoleplayPrompt`, `buildDialoguePrompt`, `buildCharacterPrompt`, `buildDebatePrompt`,
  `buildPhotoPrompt` — mode-specific in-character/system prompts. For Debate the AI always argues
  the side **opposite** the learner.

The chat service assembles per-conversation context (`buildContext`) and injects the right system
prompt based on `ConversationMode` before calling the provider.

## Structured output schemas (`@vaani/types`)
`AIFeedbackSchema` (reply, corrections[], vocabulary[], pronunciation[], 3 scores),
`SentenceEvaluationSchema` (corrected, betterVersion, explanation, isCorrect, 3 scores),
`DebateFeedbackSchema` (summary, strengths[], improvements[], 3 scores). Scores are clamped 0–100;
arrays default to empty. **Raw model output is never used directly.**

## `@vaani/meeting` analysis provider (P7B)

A parallel abstraction mirroring the `@vaani/ai` pattern for Meeting Intelligence:
```
MeetingAnalysisProvider.analyze(input): Promise<MeetingAnalysisDTO>
MeetingTranscriptProvider.generate({ meetingTitle, knownParticipants }): { segments, language }
createMeetingAnalysisProvider(env) → MockMeetingAnalysisProvider   (only mock today)
createMeetingTranscriptProvider(env) → MockMeetingTranscriptProvider
```
- `MockMeetingTranscriptProvider` fabricates a plausible, deterministic transcript (**no real audio
  capture**), deliberately including some lines with explicit owner+date and some without, to
  exercise sentinel behaviour.
- `MockMeetingAnalysisProvider` converts the transcript into a schema-valid summary/decisions/
  action-items/participants. It **never fabricates data** (`CLAUDE.md` §15): participants come only
  from the known roster (plus speaker labels that actually appear); an action item's owner is set
  only when the line names a **known** participant, else `Unassigned`; due dates only from an
  explicit ISO date in the line, else `Not specified`; decisions/risks/questions/action-items are
  derived strictly from explicit `DECISION:/ACTION:/RISK:/QUESTION:` cue markers (or a trailing `?`).

A real STT/LLM-backed meeting provider is a future phase; only the Mock exists today.

## Swapping providers (operational)
Set `AI_PROVIDER=openai`, `OPENAI_API_KEY=…` (and optionally `OPENAI_BASE_URL`) in the **backend**
env. No feature code changes. Keys never appear in `apps/web`. To go back to deterministic behaviour,
unset `AI_PROVIDER` (defaults to `mock`).

## Related docs
- [`API_DESIGN.md`](./API_DESIGN.md) · [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md) ·
  [`MEETING_ARCHITECTURE.md`](./MEETING_ARCHITECTURE.md)
