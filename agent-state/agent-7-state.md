# Agent 7 — Voice + Meeting Intelligence

## Phase
P7

## Status
COMPLETE (integrated into develop; one deferred gap — see Blockers)

## Completed
- P7A voice: Web Speech STT/TTS hooks (`useSpeechRecognition`, `useSpeechSynthesis`),
  `lang.ts`, and a Call page wiring a live voice conversation with permission handling.
- P7B Meeting Intelligence (mock/prototype):
  - `@vaani/types` meeting contracts (Zod) — reconciled with Prisma models
  - `packages/meeting` domain package: `MeetingAnalysisProvider` interface +
    `MockMeetingAnalysisProvider` (+ mock transcript + factory), mirroring `@vaani/ai`.
    Analyzer never fabricates owners/dates/participants (Unassigned / Not specified sentinels).
    Unit test asserts the no-fabrication rule.
  - Prisma: 9 meeting models + 5 enums; migration
    `20260922060000_add_meeting_intelligence`; client regenerated.
  - API module `apps/api/src/modules/meeting` (route→controller→service→prisma),
    registered at `/api/meetings`. Schedule, list, detail, recording start/pause/
    resume/stop (state only), privacy settings, delete recording/transcript. Consent
    enforced server-side (`recordingConsent: literal(true)` + service guard). Mock
    analysis runs on STOP. Supertest covers schedule + consent rejection.
  - Web `apps/web/src/features/meeting` + pages: schedule form, meeting list,
    meeting detail (Overview / Discussion / Key decisions / Risks / Questions /
    Action items table / Next steps), recording controls with visible indicator,
    privacy panel. Routes in `App.tsx`; nav entry (ready) in `config/nav.ts`. RTL
    tests for schedule form + action-items table.
  - `docs/MEETING_ARCHITECTURE.md` (module, consent/privacy, real-capture deferred).

## Current Task
Phase 7 marked complete. Integrated into develop (fa554c4); gate green (60 tests).

## Blockers
Deferred gap (not blocking): P7A mic/speaker **device selection** is not implemented —
the Web Speech API binds the default OS device; a real device picker needs a
`getUserMedia`-based STT pipeline, which pairs with the deferred real-capture work.

## Next Step
Real Teams/AVD capture + STT/diarization + audio device selection deferred to a later
phase, behind the `@vaani/meeting` / voice provider abstractions.
