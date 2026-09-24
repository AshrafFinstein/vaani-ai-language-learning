import { fetchWithRetry, type HttpHardeningOptions } from '@vaani/ai';
import type { CalendarEventDTO } from '@vaani/types';
import type { CalendarProvider } from './types.js';

export interface OutlookCalendarConfig {
  /**
   * A Microsoft Graph *delegated* bearer access token. Minting this token (Azure AD
   * / MSAL OAuth sign-in) is OUT OF SCOPE — the token is taken from env/config. See
   * docs/MEETING_AUTOMATION_ARCHITECTURE.md for the Azure app-registration + delegated
   * `Calendars.Read` / `OnlineMeetings.Read` consent required to activate this provider.
   */
  accessToken: string;
  /** Graph base URL, default https://graph.microsoft.com/v1.0. */
  baseUrl?: string;
  hardening?: HttpHardeningOptions;
}

/** Shape of the Graph event fields we consume (only the parts we need). */
interface GraphEvent {
  id: string;
  subject?: string | null;
  start?: { dateTime?: string; timeZone?: string } | null;
  end?: { dateTime?: string; timeZone?: string } | null;
  onlineMeeting?: { joinUrl?: string | null } | null;
  onlineMeetingUrl?: string | null;
  organizer?: { emailAddress?: { name?: string | null; address?: string | null } | null } | null;
  attendees?: Array<{
    emailAddress?: { name?: string | null; address?: string | null } | null;
  }> | null;
}

interface GraphCalendarViewResponse {
  value?: GraphEvent[];
}

/**
 * REAL Microsoft Graph read-only calendar provider. Opt-in: constructed only when
 * `CALENDAR_PROVIDER=outlook` AND a token is configured (see the factory). Uses the
 * hardened {@link fetchWithRetry} (timeout + bounded backoff on 429/5xx/network).
 *
 * No secrets live here — the caller passes the bearer token in via config. Vaani
 * only ever READS the calendar (`GET /me/calendarView`); it never writes back.
 */
export class OutlookCalendarProvider implements CalendarProvider {
  readonly name = 'outlook' as const;
  private readonly baseUrl: string;

  constructor(private readonly config: OutlookCalendarConfig) {
    if (!config.accessToken) {
      throw new Error(
        'OutlookCalendarProvider requires a Microsoft Graph access token (set MS_GRAPH_ACCESS_TOKEN).',
      );
    }
    this.baseUrl = (config.baseUrl ?? 'https://graph.microsoft.com/v1.0').replace(/\/$/, '');
  }

  async listUpcomingMeetings(sinceIso: string, untilIso: string): Promise<CalendarEventDTO[]> {
    // /me/calendarView expands recurring events within the window; ordered by start.
    const params = new URLSearchParams({
      startDateTime: sinceIso,
      endDateTime: untilIso,
      $orderby: 'start/dateTime',
      $top: '50',
      $select: 'id,subject,start,end,onlineMeeting,onlineMeetingUrl,organizer,attendees',
    });
    const url = `${this.baseUrl}/me/calendarView?${params.toString()}`;

    const res = await fetchWithRetry(
      'MicrosoftGraph',
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          Accept: 'application/json',
          // Ask Graph to return UTC so parsed timestamps are unambiguous.
          Prefer: 'outlook.timezone="UTC"',
        },
      },
      this.config.hardening,
    );

    const data = (await res.json()) as GraphCalendarViewResponse;
    const events = data.value ?? [];
    return events.map((e) => normalizeGraphEvent(e)).filter((e): e is CalendarEventDTO => e !== null);
  }
}

/** Parses a Graph `start`/`end` value (UTC dateTime, no offset) into an ISO string. */
function parseGraphDateTime(dt?: { dateTime?: string } | null): string | null {
  if (!dt?.dateTime) return null;
  // Graph returns e.g. "2026-10-01T10:00:00.0000000" (no zone) with Prefer UTC → append Z.
  const raw = dt.dateTime.endsWith('Z') ? dt.dateTime : `${dt.dateTime}Z`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Extracts the Teams thread id from a join URL when present (best-effort, never invented). */
function teamsMeetingIdFromJoinUrl(joinUrl: string | null): string | null {
  if (!joinUrl) return null;
  const match = joinUrl.match(/19%3ameeting_[^%/]+%40thread\.v2|19:meeting_[^/]+@thread\.v2/i);
  return match ? decodeURIComponent(match[0]) : null;
}

/** Maps a Graph event to a normalized {@link CalendarEventDTO}; returns null when unusable. */
function normalizeGraphEvent(e: GraphEvent): CalendarEventDTO | null {
  const start = parseGraphDateTime(e.start);
  const end = parseGraphDateTime(e.end);
  if (!e.id || !start || !end) return null;

  const joinUrl = e.onlineMeeting?.joinUrl ?? e.onlineMeetingUrl ?? null;
  const organizerEmail = e.organizer?.emailAddress;
  const organizer = organizerEmail?.name
    ? { name: organizerEmail.name, email: organizerEmail.address ?? null }
    : null;

  const attendees = (e.attendees ?? [])
    .map((a) => a.emailAddress)
    .filter((a): a is NonNullable<typeof a> => Boolean(a?.name))
    .map((a) => ({ name: a.name!, email: a.address ?? null }));

  return {
    externalCalendarId: e.id,
    title: e.subject?.trim() || 'Untitled meeting',
    start,
    end,
    joinUrl,
    teamsMeetingId: teamsMeetingIdFromJoinUrl(joinUrl),
    organizer,
    attendees,
  };
}
