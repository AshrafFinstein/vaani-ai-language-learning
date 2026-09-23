import type { Prisma } from '@prisma/client';
import type {
  CalendarEventDTO,
  CalendarProviderKind,
  CalendarSyncResultDTO,
  MeetingDTO,
} from '@vaani/types';
import { parseIcsContent, type CalendarProvider } from '@vaani/meeting';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import { getCalendarProvider, getCalendarStatus } from '../../lib/calendar.js';

/** Meeting scalar fields needed to build a MeetingDTO (no relations required). */
type MeetingRow = Prisma.MeetingGetPayload<Record<string, never>>;

function meetingToDTO(m: MeetingRow): MeetingDTO {
  return {
    id: m.id,
    title: m.title,
    provider: m.provider as MeetingDTO['provider'],
    scheduledStart: m.scheduledStart.toISOString(),
    scheduledEnd: m.scheduledEnd.toISOString(),
    recordingEnabled: m.recordingEnabled,
    transcriptionEnabled: m.transcriptionEnabled,
    aiAnalysisEnabled: m.aiAnalysisEnabled,
    analysisStatus: m.analysisStatus as MeetingDTO['analysisStatus'],
    status: m.status as MeetingDTO['status'],
    teamsMeetingId: m.teamsMeetingId,
    joinUrl: m.joinUrl,
    externalCalendarId: m.externalCalendarId,
    notifiedAt: m.notifiedAt ? m.notifiedAt.toISOString() : null,
    startedAt: m.startedAt ? m.startedAt.toISOString() : null,
    endedAt: m.endedAt ? m.endedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

/** Picks a MeetingProvider enum value from the event (Teams when it has a Teams id). */
function providerFor(event: CalendarEventDTO): MeetingDTO['provider'] {
  return event.teamsMeetingId || event.joinUrl?.includes('teams.microsoft.com') ? 'TEAMS' : 'OTHER';
}

/**
 * Syncs upcoming calendar events into local Meeting rows. Idempotent by
 * `externalCalendarId` (scoped per user via the `@@unique([userId, externalCalendarId])`
 * key): re-running with the same events UPDATES existing rows rather than duplicating.
 *
 * Only *future/current* events are synced (respecting the requested window). Manual
 * meetings (no externalCalendarId) are never touched. The calendar is read-only —
 * Vaani never writes back to the user's calendar.
 */
/** Reads a user's per-user published ICS feed URL (null when unset / no settings row). */
async function userIcsUrl(userId: string): Promise<string | null> {
  const settings = await prisma.meetingSettings.findUnique({ where: { userId } });
  return settings?.icsCalendarUrl ?? null;
}

/**
 * Upserts a batch of normalized calendar events into local Meeting rows, idempotently by
 * `externalCalendarId`. Shared by the feed sync and the `.ics` file import. Never clobbers
 * lifecycle/analysis state on update, and never fabricates participants (CLAUDE.md §15).
 */
async function upsertEvents(
  userId: string,
  events: CalendarEventDTO[],
): Promise<{ created: number; updated: number; rows: MeetingRow[] }> {
  let created = 0;
  let updated = 0;
  const rows: MeetingRow[] = [];

  for (const event of events) {
    const existing = await prisma.meeting.findUnique({
      where: { userId_externalCalendarId: { userId, externalCalendarId: event.externalCalendarId } },
    });

    if (existing) {
      // Update calendar-derived fields only; never clobber lifecycle/analysis state.
      const row = await prisma.meeting.update({
        where: { id: existing.id },
        data: {
          title: event.title,
          scheduledStart: new Date(event.start),
          scheduledEnd: new Date(event.end),
          joinUrl: event.joinUrl,
          teamsMeetingId: event.teamsMeetingId,
          provider: providerFor(event),
        },
      });
      rows.push(row);
      updated += 1;
    } else {
      const row = await prisma.meeting.create({
        data: {
          userId,
          title: event.title,
          provider: providerFor(event),
          scheduledStart: new Date(event.start),
          scheduledEnd: new Date(event.end),
          externalCalendarId: event.externalCalendarId,
          joinUrl: event.joinUrl,
          teamsMeetingId: event.teamsMeetingId,
          status: 'SCHEDULED',
          // A recording session exists from schedule time in IDLE with no consent.
          recording: { create: { state: 'IDLE', recordingConsent: false } },
          // Attendees become participants with deterministic speaker labels. Never
          // invented — these come straight from the calendar event (CLAUDE.md §15).
          participants: {
            create: event.attendees.map((a, i) => ({
              name: a.name,
              email: a.email,
              speakerLabel: `Speaker ${i + 1}`,
            })),
          },
        },
      });
      rows.push(row);
      created += 1;
    }
  }

  return { created, updated, rows };
}

/** Decodes an ICS payload that may be a data-URL / bare base64, else returns it as-is. */
function decodeIcsPayload(content: string): string {
  const dataUrl = /^data:[^;]*;base64,(.*)$/is.exec(content.trim());
  if (dataUrl) return Buffer.from(dataUrl[1]!, 'base64').toString('utf8');
  // A bare base64 blob (no VCALENDAR marker) — decode; otherwise treat as raw ICS text.
  if (!/BEGIN:VCALENDAR/i.test(content) && /^[A-Za-z0-9+/=\s]+$/.test(content.trim())) {
    const decoded = Buffer.from(content.trim(), 'base64').toString('utf8');
    if (/BEGIN:VCALENDAR/i.test(decoded)) return decoded;
  }
  return content;
}

export const calendarService = {
  /** Current calendar connection status (for the Settings panel), per user. */
  async status(
    userId: string,
  ): Promise<{ provider: CalendarProviderKind; connected: boolean; readOnly: true }> {
    const url = await userIcsUrl(userId);
    return { ...getCalendarStatus(url), readOnly: true };
  },

  async sync(
    userId: string,
    sinceIso?: string,
    untilIso?: string,
    now: Date = new Date(),
    provider?: CalendarProvider,
  ): Promise<CalendarSyncResultDTO> {
    const since = sinceIso ?? now.toISOString();
    // Default window: from now to 7 days out.
    const until = untilIso ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Prefer the user's own ICS feed URL when one is configured (admin-free path).
    const url = await userIcsUrl(userId);
    const activeProvider = provider ?? getCalendarProvider(url);

    const events = await activeProvider.listUpcomingMeetings(since, until);
    const { created, updated, rows } = await upsertEvents(userId, events);

    return {
      provider: getCalendarStatus(url).provider,
      created,
      updated,
      meetings: rows.map(meetingToDTO),
    };
  },

  /**
   * Sets (or clears, when blank) the user's published ICS feed URL, then triggers a sync
   * so their meetings appear immediately. The URL is validated as http(s)/webcal upstream
   * (Zod). Returns the sync result using the newly-stored URL.
   */
  async setIcsUrl(
    userId: string,
    url: string,
    sinceIso?: string,
    untilIso?: string,
    now: Date = new Date(),
    provider?: CalendarProvider,
  ): Promise<CalendarSyncResultDTO> {
    const trimmed = url.trim();
    const value = trimmed === '' ? null : trimmed;
    await prisma.meetingSettings.upsert({
      where: { userId },
      create: { userId, icsCalendarUrl: value },
      update: { icsCalendarUrl: value },
    });

    // Clearing the URL: just report the (now Mock/Outlook) status with no events.
    if (!value) {
      return { provider: getCalendarStatus(null).provider, created: 0, updated: 0, meetings: [] };
    }

    const since = sinceIso ?? now.toISOString();
    const until = untilIso ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const activeProvider = provider ?? getCalendarProvider(value);
    const events = await activeProvider.listUpcomingMeetings(since, until);
    const { created, updated, rows } = await upsertEvents(userId, events);

    return {
      provider: getCalendarStatus(value).provider,
      created,
      updated,
      meetings: rows.map(meetingToDTO),
    };
  },

  /**
   * Imports an uploaded `.ics` file: parse its content (no network) and upsert Meetings
   * via the same idempotency as sync (by UID). The window defaults wide so a manually
   * exported file's events aren't silently dropped for being slightly out of range.
   */
  async importIcs(
    userId: string,
    content: string,
    sinceIso?: string,
    untilIso?: string,
    now: Date = new Date(),
  ): Promise<CalendarSyncResultDTO> {
    const ics = decodeIcsPayload(content);
    if (!/BEGIN:VCALENDAR/i.test(ics)) {
      throw ApiException.badRequest('The uploaded file is not a valid iCalendar (.ics) document');
    }
    // Import defaults to a generous window (30 days back → 365 days out) so a hand-exported
    // file is not filtered away; callers may still pass an explicit window.
    const since = sinceIso ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const until = untilIso ?? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const events = parseIcsContent(ics, since, until);
    const { created, updated, rows } = await upsertEvents(userId, events);

    return { provider: 'ics', created, updated, meetings: rows.map(meetingToDTO) };
  },
};
