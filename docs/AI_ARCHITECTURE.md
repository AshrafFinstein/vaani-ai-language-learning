# AI Architecture — Vaani AI

_Last updated: 2026-09-23. Author: Agent 2 (Architecture)._

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
Both have Mock (default, offline) and OpenAI (Whisper/TTS, opt-in) implementations — see below.

## Implementations

```
AIProvider                 SpeechToTextProvider       TextToSpeechProvider
├── MockAIProvider  ✅       ├── MockSttProvider ✅      ├── MockTtsProvider ✅
└── OpenAIProvider  ✅       └── OpenAISttProvider ✅    └── OpenAITtsProvider ✅
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
`baseUrl`; **model is configurable** via `OPENAI_MODEL` (default `gpt-4o-mini`). **Requires an API
key** and throws at construction if missing. `streamChat` streams via the OpenAI SSE
(`stream: true`) response, parsing frames into deltas. Structured methods request
`response_format: json_object`, then defensively parse (strip code fences, fall back to the first
`{…}` block) and **validate through the Zod schema** before returning (`parseFeedback`,
`parseDebateFeedback`, `parseJson`). `describeImage` uses the multimodal `image_url` message format
(accepts data-URLs). Because it implements `AIProvider`, swapping vendors is a config change only.

### Hardening (`http.ts`) — shared by the OpenAI text + speech providers
Every real request goes through `fetchWithRetry`:
- **Timeout** — a per-attempt `AbortController` cancels a hung request (`OPENAI` default 30s).
- **Retries with exponential backoff** — bounded (default 3 attempts) on transient failures only:
  HTTP **429/5xx**, network errors, and timeouts. Non-retryable errors (e.g. **401 bad key**, 400)
  fail fast so misconfiguration is loud.
- **Typed errors** — failures surface as `ProviderHttpError { kind: 'timeout'|'network'|'http',
  status?, retryable }` instead of opaque strings, so callers can branch.
- **Graceful fallback to Mock** — opt-in via `AI_FALLBACK_TO_MOCK=true`. When a structured method
  hits a *retryable* failure it degrades to the deterministic Mock provider instead of 500-ing. A
  non-retryable error (bad key) is **never** masked. `streamChat` does not fall back (streaming
  semantics); it still times out/retries.

### Real speech (`openai-speech.ts`) — optional, opt-in
- `OpenAISttProvider` → `POST {baseUrl}/audio/transcriptions` (Whisper, multipart form-data),
  model via `OPENAI_STT_MODEL` (default `whisper-1`). Returns `{ text, confidence }`.
- `OpenAITtsProvider` → `POST {baseUrl}/audio/speech`, model `OPENAI_TTS_MODEL` (default `tts-1`),
  voice `OPENAI_TTS_VOICE` (default `alloy`). Returns raw audio bytes + `mimeType`
  (`TextToSpeechResult`). Both share the timeout/retry/typed-error hardening and require a key.

## The factory (`factory.ts`)

```
createAIProvider({ provider, openaiApiKey, openaiBaseUrl, openaiModel, fallbackToMock }): AIProvider
  'openai' → new OpenAIProvider({ apiKey, baseUrl, model, fallbackToMock })
  'mock' | default → new MockAIProvider()
createSttProvider(env) → OpenAISttProvider  when speech selector = 'openai' AND key present, else Mock
createTtsProvider(env) → OpenAITtsProvider  when speech selector = 'openai' AND key present, else Mock
```

The speech selector is `SPEECH_PROVIDER` when set, else it falls back to `AI_PROVIDER` — so
`AI_PROVIDER=openai` with a key also turns on real speech. **Without a key the factory always
returns the Mock**, so the suite runs offline.

Env-driven: the API reads the vars below (`apps/api/src/env.ts`) and constructs providers **lazily**
through `getAIProvider()` / `getSttProvider()` / `getTtsProvider()` (`apps/api/src/lib/ai.ts`) — so
a key never needs to exist at import time in tests. Each provider is a singleton per process.

### Env matrix (backend only — keys never reach the browser)

| Var | Default | Controls |
| --- | --- | --- |
| `AI_PROVIDER` | `mock` | Text provider: `mock` \| `openai` |
| `OPENAI_API_KEY` | _empty_ | Real path opt-in — no key ⇒ Mock even if `openai` selected |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model |
| `AI_FALLBACK_TO_MOCK` | `false` | Degrade to Mock on transient OpenAI failure |
| `SPEECH_PROVIDER` | _(falls back to `AI_PROVIDER`)_ | Speech provider: `mock` \| `openai` |
| `OPENAI_STT_MODEL` | `whisper-1` | Whisper model |
| `OPENAI_TTS_MODEL` | `tts-1` | TTS model |
| `OPENAI_TTS_VOICE` | `alloy` | TTS voice |
| `VITE_SERVER_SPEECH` (web) | `false` | Opt-in server TTS/STT on the Call page (else browser Web Speech) |

### Speech endpoints (`apps/api/src/modules/speech/`)
Auth-protected + tightly rate-limited (`speechLimiter`, 20/min in prod — billable). Audio crosses as
base64 (or a base64 data-URL) in JSON; a per-route 25mb body limit is applied for audio routes.
- `POST /api/speech/transcribe` `{ audio, languageCode? }` → `{ text, confidence, provider }`.
- `POST /api/speech/synthesize` `{ text, languageCode? }` → `{ audio(base64), mimeType, provider }`.

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
Set `AI_PROVIDER=openai`, `OPENAI_API_KEY=…` (and optionally `OPENAI_BASE_URL`, `OPENAI_MODEL`) in
the **backend** env. This also enables real STT/TTS unless `SPEECH_PROVIDER` overrides it. Turn on
graceful degradation with `AI_FALLBACK_TO_MOCK=true`. No feature code changes — the abstraction is
config-driven. Keys never appear in `apps/web`. To go back to deterministic behaviour, unset
`AI_PROVIDER` (defaults to `mock`); with no key the factory returns the Mock regardless, so the full
test suite runs offline with no network access (tests stub `fetch`).

## Related docs
- [`API_DESIGN.md`](./API_DESIGN.md) · [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md) ·
  [`MEETING_ARCHITECTURE.md`](./MEETING_ARCHITECTURE.md)
