# Meeting Intelligence on Azure Virtual Desktop (admin-free)

This guide covers the **admin-free** Meeting Intelligence flow for users on a locked-down
**Azure Virtual Desktop (AVD)** who **cannot** perform the Azure app registration or grant
the admin consent that Microsoft Graph requires. Instead of Graph, you connect a
**published, read-only ICS calendar feed** and/or import an exported `.ics` file, then feed
analysis from an **uploaded recording OR a provided transcript**.

The Microsoft Graph (`outlook`) provider and live local/AVD audio capture remain **optional
and deferred** — nothing here needs them.

## The end-to-end flow

```
Publish Outlook calendar (ICS URL)   ─┐
   OR export a .ics file              ─┤→  Vaani calendar sync (read-only, idempotent by UID)
                                        │        │
                                        │        ▼
                                        │   Today's Meetings + reminders (scheduler tick)
                                        │        │
                                        │        ▼
                                        │   Join the Teams meeting (join URL from the feed)
                                        │        │
                                        ▼        ▼
             Upload a recording (real Whisper STT)  OR  upload a transcript (.vtt / text)
                                        │
                                        ▼
                    AI analysis: summary · decisions · action items · questions · topics
```

Everything is **consent-gated** and **read-only**: Vaani never writes to your calendar and
never captures covertly (CLAUDE.md §13–15).

## 1. Publish your Outlook calendar as an ICS link

In **Outlook on the web** (owa):

1. **Settings → Calendar → Shared calendars**.
2. Under **Publish a calendar**, pick the calendar and a permission level (availability or
   full details), then **Publish**.
3. Copy the **ICS** link (ends in `.ics`; a `webcal://` link works too — it is normalized to
   `https://` automatically).

Then in Vaani: **Meetings → Settings → Calendar connection → Published ICS feed URL**, paste
the link, and click **Save & sync**. The connection status shows **Published ICS feed
(read-only)**. Your upcoming meetings appear under **Today's Meetings**.

> The per-user URL is stored on `MeetingSettings.icsCalendarUrl` and takes precedence over the
> env-level `ICS_CALENDAR_URL`. Setting it activates the ICS path for that user without any
> global config change.

## 2. Or import an exported `.ics` file (no network)

If you cannot publish a live feed, export events from Outlook to a `.ics` file and use
**Import .ics file** in the same panel. The file is parsed locally (no network) and upserted
into your meetings, idempotently by event `UID`.

## 3. Reminders + joining

Run the scheduler (the **Refresh status** button, or the `POST /api/meetings/scheduler/tick`
endpoint) to move meetings through `SCHEDULED → NOTIFIED → …` and raise in-app reminders. Each
synced meeting carries the **Teams join URL** extracted from the calendar event, so you can
join directly.

## 4. Provide a recording OR a transcript for analysis

On a meeting's **Recording** tab you can drop **either**:

- **A recording** (already-recorded audio file) → real **Whisper** speech-to-text →
  analysis. (`POST /api/meetings/:id/transcribe`)
- **A transcript** — a Teams `.vtt` export (speaker-labelled) or plain-text notes → parsed →
  analysis. (`POST /api/meetings/:id/transcript`)

Both are **consent-gated**: the meeting must have **transcription enabled** and the recording
session must have granted **transcript consent**. The analyzer only ever sees the supplied
evidence — it never fabricates participants, owners, decisions, or action items.

## How the ICS provider parses events + extracts Teams URLs

The dependency-free parser (`packages/meeting/src/calendar/ics-parser.ts`) handles:

- **Line unfolding** (RFC 5545 continuation lines starting with a space/tab) and TEXT
  unescaping (`\n`, `\,`, `\;`, `\\`).
- **DTSTART/DTEND**: UTC (`…Z`), `VALUE=DATE` all-day, and floating/zoned times via a small
  named-`TZID` offset table (e.g. *India Standard Time* → +5:30). Unknown zones fall back to
  UTC.
- **Teams join URL** from `X-MICROSOFT-SKYPETEAMSMEETINGURL`, then `LOCATION`, `URL`, or a
  `teams.microsoft.com/l/meetup-join` / `.../meeting` link inside `DESCRIPTION`. The Teams
  thread id (`teamsMeetingId`) is derived from the URL when present — never invented.
- **Organizer / attendees** from `ORGANIZER` / `ATTENDEE` (`CN=` name + `mailto:` email).

### Recurring-event limitation (documented)

Only `RRULE:FREQ=DAILY` and `FREQ=WEEKLY` (with optional `INTERVAL` / `UNTIL` / `COUNT`) are
expanded, and only occurrences whose start falls **inside the queried window** are emitted.
Each recurring occurrence gets a stable, occurrence-specific id (`<UID>_<startMs>`) so sync
stays idempotent yet distinct per instance. **Monthly/yearly frequencies, `BYDAY`, `EXDATE`,
and `RDATE` are not honoured** — such events fall back to their base `DTSTART` only. If you
need full recurrence fidelity, use the Graph (`outlook`) provider, which expands recurrences
server-side.

## Configuration summary

| Setting | Where | Notes |
| --- | --- | --- |
| `CALENDAR_PROVIDER=ics` | `.env` | Activates ICS when a URL is configured. Mock stays default. |
| `ICS_CALENDAR_URL` | `.env` | Env-level published feed URL (empty by default). |
| `MeetingSettings.icsCalendarUrl` | per-user (UI) | Overrides the env URL; activates ICS on its own. |

Graph/live-capture remain optional; see `docs/MEETING_AUTOMATION_ARCHITECTURE.md`.
