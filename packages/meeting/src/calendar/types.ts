import type { CalendarEventDTO } from '@vaani/types';

/**
 * The calendar abstraction. Feature code depends ONLY on this interface, never on a
 * concrete backend (Graph/Outlook), mirroring the `@vaani/ai` provider pattern.
 *
 * The calendar is strictly READ-ONLY — Vaani never writes back to a user's calendar.
 * The Mock is the default so the suite runs offline with no token/network; the real
 * Outlook (Microsoft Graph) provider is opt-in via env + a bearer token.
 */
export interface CalendarProvider {
  readonly name: 'mock' | 'outlook';
  /**
   * Lists upcoming meetings in the `[sinceIso, untilIso]` window as normalized events.
   * Implementations must not fabricate events — an empty window yields `[]`.
   */
  listUpcomingMeetings(sinceIso: string, untilIso: string): Promise<CalendarEventDTO[]>;
}
