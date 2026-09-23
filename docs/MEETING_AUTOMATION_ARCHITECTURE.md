# Meeting AI Automation — Architecture

This extends the Meeting Intelligence module (see `MEETING_ARCHITECTURE.md`) into a
**calendar-driven, consent-gated "Meeting AI"**: it syncs upcoming meetings from a
read-only calendar, notifies the user, advances a validated lifecycle state machine,
(optionally) captures locally, transcribes with real Whisper STT on **provided** audio,
maps speakers, and produces an AI analysis (summary, decisions, action items,
**questions**, **important topics**).

> Mock is the DEFAULT everywhere. The full gate (`typecheck && lint && test`) runs
> **offline, deterministic, and green** — no network, no key, no live calendar. Real
> Graph/OpenAI paths are strictly OPT-IN via env. No covert capture ever (CLAUDE.md §13–15).

## End-to-end flow

```
calendar (Outlook read-only | Mock)
   │  CalendarService.sync  (idempotent by externalCalendarId)
   ▼
Meeting rows (status = SCHEDULED)
   │  MeetingScheduler.tick(now)   ← invoked via POST /api/meetings/scheduler/tick
   ▼
SCHEDULED ──reminder window──▶ NOTIFIED  (+ MEETING_REMINDER notification)
        └──start passed──────▶ STARTED   (+ MEETING_STARTED notification)
                                   │  (optional) Local/AVD capture — STATE ONLY, deferred
                                   ▼
                              CAPTURING
                                   │  end passed
                                   ▼
                              PROCESSING ──analysis pipeline──▶ COMPLETED (+ ANALYSIS_READY)
```

Analysis pipeline (unchanged core, extended output):
```
transcript (Mock generator | real Whisper STT on PROVIDED audio)
   → SpeakerService (labels → participants; unmapped = raw label / Unassigned)
   → MeetingAnalysisProvider (Mock default | OpenAI opt-in)
   → summary + decisions + action items + questions + important topics
```

## Provider abstractions

All AI/calendar/capture access goes through interfaces (mirroring `@vaani/ai`), so
swapping a backend is an env change only. Concrete providers live in `@vaani/meeting`.

| Abstraction               | Default (offline)             | Real / opt-in                         | Status  |
| ------------------------- | ----------------------------- | ------------------------------------- | ------- |
| `CalendarProvider`        | `MockCalendarProvider`        | `OutlookCalendarProvider` (Graph)     | REAL    |
| `MeetingAnalysisProvider` | `MockMeetingAnalysisProvider` | `OpenAIMeetingAnalysisProvider`       | REAL    |
| `MeetingTranscriptProvider` | `MockMeetingTranscriptProvider` | (real STT on provided audio via API) | REAL STT / mock generator |
| `MeetingCaptureProvider`  | `LocalAudioCaptureProvider`   | — (real audio capture)                | STUB / DEFERRED |
| `SpeakerService`          | deterministic label mapping   | (same; evidence-based only)           | REAL    |

Factories: `createCalendarProvider(env)`, `createMeetingAnalysisProvider(env)`,
`createCaptureProvider()`. Each returns the real provider ONLY when its selector is set
AND the required credential/token is present; otherwise the deterministic Mock.

## What is REAL vs STUB vs DEFERRED

- **REAL**
  - `OutlookCalendarProvider` — Microsoft Graph `GET /me/calendarView`, read-only,
    hardened via `fetchWithRetry` (timeout + bounded backoff on 429/5xx/network).
  - `OpenAIMeetingAnalysisProvider` — OpenAI-compatible `/chat/completions`, re-validates
    output and re-applies the no-fabrication sentinels.
  - Whisper STT on **provided** audio (`POST /api/meetings/:id/transcribe`, pre-existing).
  - Lifecycle state machine, CalendarService sync, MeetingScheduler, NotificationService,
    SpeakerService, questions/topics extraction — all real and unit-tested.
- **STUB**
  - `LocalAudioCaptureProvider` — models the capture **state** machine only
    (IDLE → CAPTURING → STOPPED). It records no bytes, refuses to start without consent,
    and reports `audioSupported: false`.
- **DEFERRED**
  - **Live local/AVD audio capture** — this environment cannot capture audio. There is
    deliberately **no** Graph/Teams recording-retrieval capture provider (out of scope).
  - **Graph OAuth / MSAL sign-in** that mints the delegated access token (see below).
  - **Push/desktop notification delivery** — notifications are **in-app only**.
  - Always-on scheduler timer — the scheduler is invoked via an endpoint/tick (an
    always-on timer would break the deterministic test suite).

## Activating the real Outlook calendar

Set the following env (Mock stays the default when either is missing):

```
CALENDAR_PROVIDER=outlook
MS_GRAPH_ACCESS_TOKEN=<delegated Graph bearer token>
MS_GRAPH_BASE_URL=https://graph.microsoft.com/v1.0   # default
```

**Azure app registration + tenant consent required** (minting the token is OUT OF SCOPE):

1. Register an application in Azure AD (Entra ID).
2. Add **delegated** Microsoft Graph permissions: `Calendars.Read` and
   `OnlineMeetings.Read`.
3. Grant tenant admin consent for those permissions.
4. Complete an OAuth 2.0 / MSAL delegated sign-in to obtain an access token for the
   signed-in user, and supply it as `MS_GRAPH_ACCESS_TOKEN`.

The provider then calls `GET /me/calendarView` (read-only) and normalizes events,
parsing the Teams `onlineMeeting.joinUrl` / `onlineMeetingUrl`. **No secret is stored in
the repo** — the token is read from `process.env` only.

## Consent & privacy model (CLAUDE.md §13–15)

- **No covert capture.** `LocalAudioCaptureProvider.start()` REFUSES without explicit
  consent, and `capability()` reports capture as unsupported/deferred so the UI never
  pretends to record. `askBeforeCapture` defaults **true**.
- **User-visible.** Today's Meetings shows a live lifecycle badge
  (Upcoming/Started/Capturing/Processing/Completed); the recording indicator remains.
- **Scheduler never auto-starts recording.** It only advances lifecycle *state* and
  emits in-app notifications. Actual capture stays consent-gated + deferred.
- **No fabrication.** The analyzer (Mock and OpenAI) derives everything from the
  transcript; owners/decidedBy/askedBy are attributed only to scheduled participants,
  else `Unassigned`; due dates only from explicit ISO dates, else `Not specified`;
  participants never exceed the roster + speakers that actually appear; important topics
  are derived strictly from extracted structured items.
- **Calendar is read-only.** Vaani never writes back to a user's calendar.

## Prisma additions

- Enums: `MeetingStatus` (SCHEDULED, NOTIFIED, STARTED, CAPTURING, PROCESSING,
  COMPLETED, CANCELLED), `NotificationType` (MEETING_REMINDER, MEETING_STARTED,
  ANALYSIS_READY).
- `Meeting`: `status`, `teamsMeetingId`, `joinUrl`, `externalCalendarId`
  (`@@unique([userId, externalCalendarId])` — the sync idempotency key), `notifiedAt`,
  `startedAt`, `endedAt`.
- `MeetingSummary.importantTopics` (`String[]`).
- `MeetingQuestion` model (ordinal, text, askedBy, answered).
- `Notification` model (userId, type, title, body, meetingId?, readAt?, createdAt).
- `MeetingSettings`: `autoCapture`, `reminderMinutes`, `captureAudio`,
  `captureTranscript`, `captureSpeaker`, `askBeforeCapture`, `extractSummary`,
  `extractDecisions`, `extractActionItems`, `extractQuestions`, `extractTopics`.

## API surface (added)

| Method | Path                                | Purpose                                    |
| ------ | ----------------------------------- | ------------------------------------------ |
| GET    | `/api/meetings/calendar/status`     | Active calendar backend + connection state |
| POST   | `/api/meetings/calendar/sync`       | Sync upcoming events → Meeting rows (idempotent) |
| POST   | `/api/meetings/scheduler/tick`      | Advance lifecycle (inject `nowIso`)        |
| GET    | `/api/meetings/capture/capability`  | Whether local capture is available (deferred) |
| GET    | `/api/notifications`                | List notifications + unread count          |
| POST   | `/api/notifications/:id/read`       | Mark one read                              |
| POST   | `/api/notifications/read-all`       | Mark all read                              |

All auth-required; ownership-scoped. Consent guards for recording/transcription are
unchanged (see `MEETING_ARCHITECTURE.md`).
