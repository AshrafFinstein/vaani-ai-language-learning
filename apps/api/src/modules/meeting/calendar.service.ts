import type { Prisma } from '@prisma/client';
import type {
  CalendarEventDTO,
  CalendarProviderKind,
  CalendarSyncResultDTO,
  MeetingDTO,
} from '@vaani/types';
import type { CalendarProvider } from '@vaani/meeting';
import { prisma } from '../../prisma.js';
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
export const calendarService = {
  /** Current calendar connection status (for the Settings panel). */
  status(): { provider: CalendarProviderKind; connected: boolean; readOnly: true } {
    return { ...getCalendarStatus(), readOnly: true };
  },

  async sync(
    userId: string,
    sinceIso?: string,
    untilIso?: string,
    now: Date = new Date(),
    provider: CalendarProvider = getCalendarProvider(),
  ): Promise<CalendarSyncResultDTO> {
    const since = sinceIso ?? now.toISOString();
    // Default window: from now to 7 days out.
    const until = untilIso ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const events = await provider.listUpcomingMeetings(since, until);

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

    return {
      provider: getCalendarStatus().provider,
      created,
      updated,
      meetings: rows.map(meetingToDTO),
    };
  },
};
