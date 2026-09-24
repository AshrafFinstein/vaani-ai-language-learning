# Meeting Intelligence — Architecture (Phase 7B)

> **See also:** [`MEETING_AUTOMATION_ARCHITECTURE.md`](./MEETING_AUTOMATION_ARCHITECTURE.md)
> — the calendar-driven "Meeting AI" that extends this module with a lifecycle state
> machine, read-only Outlook/Graph calendar sync, in-app notifications, a scheduler,
> speaker mapping, questions/important-topics extraction, and a (deferred) local capture
> path. Mock stays the default everywhere; real Graph/OpenAI are opt-in via env.

Vaani AI's Meeting Intelligence module schedules meetings, models a consent-gated
recording lifecycle, and produces an AI summary (overview, discussion points, key
decisions, risks/blockers, questions, action items, next steps) from a transcript.

**This phase is a MOCK/prototype.** No real Teams/AVD/desktop/audio capture is
implemented — the recording lifecycle is modelled as *state transitions only*, and
the transcript + analysis are produced by deterministic mock providers. Real capture
is deferred (see "Deferred to real-capture phase" below).

## Module overview

```
apps/web/src/features/meeting        UI: schedule form, list, detail (analysis),
apps/web/src/pages/app/Meeting*.tsx  recording controls, privacy panel
        │  (fetch, credentials: include)
        ▼
apps/api/src/modules/meeting         route → controller → service → prisma
        │
        ├── @vaani/types (meeting.ts)  Zod contracts — single source of truth
        ├── @vaani/meeting             provider abstraction (analysis + transcript)
        └── Prisma models              Meeting, MeetingParticipant, RecordingSession,
                                       Transcript, TranscriptSegment, MeetingSummary,
                                       MeetingDecision, ActionItem, MeetingSettings
```

- **Backend layering** follows the project rule: `route → controller → service → prisma`.
  Only the service touches Prisma. Zod validation (`validateBody`) and `requireAuth`
  guard every route, matching the `chat`/`practice` modules.
- **Provider abstraction** mirrors `@vaani/ai`. Feature code depends only on the
  `MeetingAnalysisProvider` / `MeetingTranscriptProvider` interfaces; today only the
  `Mock*` implementations exist, selected by `createMeetingAnalysisProvider()` /
  `createMeetingTranscriptProvider()`. A real STT/LLM-backed provider slots in here
  without touching callers.

### API surface (`/api/meetings`, all auth-required)

| Method | Path                          | Purpose                                        |
| ------ | ----------------------------- | ---------------------------------------------- |
| POST   | `/`                           | Schedule a meeting (+ participants + IDLE session) |
| GET    | `/`                           | List meetings (compact summaries)              |
| GET    | `/:id`                        | Meeting detail + analysis                      |
| POST   | `/:id/recording/start`        | Start recording — **consent required**         |
| POST   | `/:id/recording/control`      | PAUSE / RESUME / STOP (STOP triggers analysis) |
| GET    | `/settings`                   | Per-user privacy defaults                      |
| PATCH  | `/settings`                   | Update privacy defaults                        |
| POST   | `/:id/transcribe`             | Real STT on **provided** audio → analysis (consent-gated) |
| DELETE | `/:id/recording`              | Delete stored recording session                |
| DELETE | `/:id/transcript`             | Delete stored transcript + segments            |

### Real STT on PROVIDED audio (`POST /:id/transcribe`)

The meeting module can now run **real speech-to-text on already-recorded audio that the
caller supplies** — this is NOT live capture. The endpoint accepts base64 audio
(`{ audio, languageCode? }`, `MeetingTranscribeAudioInput`), transcribes it through the
`@vaani/ai` STT provider (`getSttProvider()` — Mock by default, OpenAI Whisper when
`SPEECH_PROVIDER`/`AI_PROVIDER=openai` + a key), then feeds the transcript into the existing
analysis pipeline (`runAnalysis` now accepts pre-supplied segments). It is auth-protected and
rate-limited (`speechLimiter`), with a 25mb audio body limit.

**Consent is enforced**: the meeting must have `transcriptionEnabled` AND a recording session
that granted `transcriptConsent`, else 403. Because plain STT returns text with no
diarization, the transcript is stored as a single speaker segment — the analyzer still never
fabricates owners/decisions (§15). **Live/covert capture stays deferred** (§14).

## Consent & privacy model (CLAUDE.md §13–15)

Recording is **user-visible and consent-gated**, enforced on both sides:

- **Client** — the recording controls require an explicit consent checkbox before the
  "Start recording" button is enabled, and a persistent recording indicator (a pulsing
  red "Recording" badge, plus "Paused"/"Stopped"/"Not recording" states) is always
  visible on the meeting detail page and in the list.
- **Server (authoritative)** — the `StartRecordingInput` contract is
  `recordingConsent: z.literal(true)`, so a request without explicit consent fails Zod
  validation (HTTP 422) before reaching the service. The service additionally rejects
  entering the `RECORDING` state without consent (defence in depth). A `RecordingSession`
  is created at schedule time in `IDLE` with `recordingConsent = false`; consent is
  recorded only when recording actually starts.
- **Recording lifecycle** is state-only: `IDLE → RECORDING ⇄ PAUSED → STOPPED`. No audio
  or video is captured. `STOP` finalises duration and, if AI analysis is enabled, runs
  the mock pipeline.
- **Privacy settings** (`MeetingSettings`) hold per-user defaults: recording/transcript
  consent, auto-record, auto-transcribe, and retention days. Users can delete a stored
  recording session or transcript per meeting.

### No fabricated data (CLAUDE.md §15)

`MockMeetingAnalysisProvider` derives everything strictly from the transcript and the
participants supplied at schedule time. It **never invents** people, owners, deadlines,
decisions, or action items:

- Action-item **owner** is set only when the line explicitly names a *known* participant;
  otherwise it is the `Unassigned` sentinel.
- Action-item **due date** is set only when the line contains an explicit `yyyy-mm-dd`
  date; otherwise it is the `Not specified` sentinel.
- A **decision's** `decidedBy` is the speaker only when that speaker maps to a scheduled
  participant; a bare `Speaker N` placeholder is not treated as a named person → `Unassigned`.
- **Participants** surfaced by the analyzer are the scheduled roster plus any transcript
  speaker label that actually appears — unmapped speakers are shown by their raw label
  with `null` email/role, never a fabricated identity.

These guarantees are covered by `packages/meeting/tests/mock-analyzer.test.ts`.

## Deferred to the real-capture phase

Real capture is **deferred pending environment validation**. The following are explicitly
out of scope for Phase 7B and gated behind the provider abstraction:

- Real **live** Microsoft Teams / Azure Virtual Desktop meeting capture (audio/video/
  transcript), respecting Teams/AVD/OS/org recording & consent policies. (Real STT on
  *provided* audio via `POST /:id/transcribe` now exists — only live/covert capture is deferred.)
- Speaker **diarization** and a production LLM-backed `MeetingAnalysisProvider` (the analysis
  step still uses the deterministic Mock analyzer; STT on provided audio yields a single
  un-diarized segment).
- Enforcement of retention windows (scheduled purge of recordings/transcripts) beyond the
  manual per-meeting delete controls shipped here.

No covert/hidden recording or generic desktop recorder is implemented, per CLAUDE.md §14.
