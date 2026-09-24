import type { CalendarEventDTO } from '@vaani/types';
import type { CalendarProvider } from './types.js';

/**
 * Deterministic, offline calendar provider — the DEFAULT everywhere. It returns a
 * fixed set of sample events *relative to the requested window* so tests are stable
 * and no network/token is needed. It never hits Microsoft Graph.
 *
 * Events are anchored to `sinceIso` (deterministic offsets from the window start) so
 * that a caller passing a controlled `now` gets reproducible, in-window events.
 */
export class MockCalendarProvider implements CalendarProvider {
  readonly name = 'mock' as const;

  async listUpcomingMeetings(sinceIso: string, untilIso: string): Promise<CalendarEventDTO[]> {
    const since = new Date(sinceIso);
    const until = new Date(untilIso);
    if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) return [];

    const minute = 60_000;
    // Three sample events at fixed offsets from the window start.
    const samples: Array<{ offsetMin: number; durationMin: number; title: string; teams: boolean }> = [
      { offsetMin: 15, durationMin: 30, title: 'Weekly Team Sync', teams: true },
      { offsetMin: 90, durationMin: 60, title: 'Product Planning', teams: true },
      { offsetMin: 240, durationMin: 45, title: 'Design Review', teams: false },
    ];

    const events: CalendarEventDTO[] = [];
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const start = new Date(since.getTime() + s.offsetMin * minute);
      const end = new Date(start.getTime() + s.durationMin * minute);
      // Keep only events whose start falls inside the requested window.
      if (start < since || start > until) continue;
      const id = `mock-event-${i + 1}`;
      events.push({
        externalCalendarId: id,
        title: s.title,
        start: start.toISOString(),
        end: end.toISOString(),
        joinUrl: s.teams ? `https://teams.microsoft.com/l/meetup-join/${id}` : null,
        teamsMeetingId: s.teams ? `19:meeting_${id}@thread.v2` : null,
        organizer: { name: 'Priya Sharma', email: 'priya@example.com' },
        attendees: [
          { name: 'Priya Sharma', email: 'priya@example.com' },
          { name: 'Alex Kim', email: 'alex@example.com' },
        ],
      });
    }
    return events;
  }
}
