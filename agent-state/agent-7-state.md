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

## Meeting AI automation (calendar-driven auto-capture) — feature/meeting-automation
Extended Meeting Intelligence into a calendar-driven "Meeting AI". All new AI/calendar/
capture access goes through provider abstractions; Mock is the default everywhere and the
gate runs offline/deterministic. Real Graph/OpenAI are opt-in via env only.

- **Lifecycle state machine** — `MeetingStatus` enum + fields on `Meeting` (status,
  teamsMeetingId, joinUrl, externalCalendarId, notifiedAt, startedAt, endedAt).
  `meeting.lifecycle.ts` (validated transitions, illegal jumps rejected) +
  `meetingService.transitionStatus` (PROCESSING→COMPLETED runs analysis).
- **Calendar** — `CalendarProvider` interface; `MockCalendarProvider` (default),
  `OutlookCalendarProvider` (real Graph `GET /me/calendarView`, read-only, hardened
  `fetchWithRetry`); `createCalendarProvider(env)` (Outlook only when
  `CALENDAR_PROVIDER=outlook` + `MS_GRAPH_ACCESS_TOKEN`). `CalendarService.sync`
  (idempotent by `externalCalendarId`, `@@unique([userId, externalCalendarId])`).
- **Capture** — `MeetingCaptureProvider` + `LocalAudioCaptureProvider` STUB (state-only,
  consent-gated, real capture DEFERRED). No Graph/Teams capture provider (out of scope).
- **Scheduler** — `MeetingScheduler.tick(now)` (injected now): reminder → NOTIFIED
  (+ MEETING_REMINDER), start → STARTED (+ MEETING_STARTED), end → PROCESSING. Endpoint-
  invoked (no always-on timer).
- **Notifications** — `Notification` model + enum, `NotificationService` (create/list/
  mark-read), `/api/notifications` endpoints. In-app only (push/desktop deferred).
- **Speaker + AI** — `SpeakerService` (label→participant, unmapped = raw label/Unassigned).
  Analysis output extended with **questions** (`MeetingQuestion`) + **important topics**
  (`MeetingSummary.importantTopics`) in Mock + OpenAI analyzers + `@vaani/types`; sentinels
  preserved. New `OpenAIMeetingAnalysisProvider` (opt-in; re-applies no-fabrication).
- **Web** — Today's Meetings (countdown + live status badge), Meeting Intelligence
  Settings panel (auto-capture, reminder mins, capture/AI toggles, ask-before-capture,
  calendar status), NotificationBell in TopBar. Routes in `App.tsx`; nav in `config/nav.ts`.
- **Config/docs** — env: `CALENDAR_PROVIDER`, `MS_GRAPH_ACCESS_TOKEN`, `MS_GRAPH_BASE_URL`,
  `MEETING_REMINDER_MINUTES`; `.env.example` updated (no secrets). New
  `docs/MEETING_AUTOMATION_ARCHITECTURE.md`; cross-linked from `MEETING_ARCHITECTURE.md`.
  Migration `20260923020000_add_meeting_automation`; client regenerated.

## Status (automation)
Gate green offline: typecheck + lint clean; tests — meeting 28, api 192, web 45.

## Blockers
Deferred (not blocking): (1) live local/AVD audio capture — environment cannot capture
audio; capture is state-only + consent-gated. (2) Graph OAuth/MSAL sign-in that mints the
delegated token (needs Azure app registration + `Calendars.Read`/`OnlineMeetings.Read`
tenant consent). (3) push/desktop notification delivery (in-app only). (4) P7A audio device
selection (unchanged from prior).

## Next Step
Wire real Graph OAuth token acquisition and real local/AVD capture behind the shipped
`CalendarProvider` / `MeetingCaptureProvider` abstractions when the environment supports them.
