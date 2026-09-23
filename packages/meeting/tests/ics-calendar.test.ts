import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  IcsCalendarProvider,
  createCalendarProvider,
  calendarProviderStatus,
  normalizeIcsUrl,
  parseIcs,
} from '../src/index.js';

const WINDOW = { since: '2026-10-01T00:00:00.000Z', until: '2026-10-31T00:00:00.000Z' };

function ics(lines: string[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR'].join('\r\n');
}

describe('parseIcs — single event, UTC times, Teams URL extraction', () => {
  it('parses one VEVENT with a Teams join URL from X-MICROSOFT-SKYPETEAMSMEETINGURL', () => {
    const content = ics([
      'BEGIN:VEVENT',
      'UID:evt-utc-1',
      'SUMMARY:Sprint Review',
      'DTSTART:20261002T100000Z',
      'DTEND:20261002T110000Z',
      'ORGANIZER;CN=Priya Sharma:mailto:priya@example.com',
      'ATTENDEE;CN=Alex Kim:mailto:alex@example.com',
      'X-MICROSOFT-SKYPETEAMSMEETINGURL:https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc%40thread.v2/0',
      'END:VEVENT',
    ]);
    const events = parseIcs(content, WINDOW.since, WINDOW.until);
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(e.externalCalendarId).toBe('evt-utc-1');
    expect(e.title).toBe('Sprint Review');
    expect(e.start).toBe('2026-10-02T10:00:00.000Z');
    expect(e.end).toBe('2026-10-02T11:00:00.000Z');
    expect(e.joinUrl).toContain('teams.microsoft.com/l/meetup-join');
    expect(e.teamsMeetingId).toBe('19:meeting_abc@thread.v2');
    expect(e.organizer).toEqual({ name: 'Priya Sharma', email: 'priya@example.com' });
    expect(e.attendees).toEqual([{ name: 'Alex Kim', email: 'alex@example.com' }]);
  });

  it('extracts a Teams URL from LOCATION and from DESCRIPTION as a fallback', () => {
    const fromLocation = parseIcs(
      ics([
        'BEGIN:VEVENT',
        'UID:loc-1',
        'SUMMARY:Loc meeting',
        'DTSTART:20261003T090000Z',
        'DTEND:20261003T093000Z',
        'LOCATION:https://teams.microsoft.com/l/meetup-join/19:meeting_loc@thread.v2/0',
        'END:VEVENT',
      ]),
      WINDOW.since,
      WINDOW.until,
    )[0]!;
    expect(fromLocation.joinUrl).toContain('meeting_loc');

    const fromDescription = parseIcs(
      ics([
        'BEGIN:VEVENT',
        'UID:desc-1',
        'SUMMARY:Desc meeting',
        'DTSTART:20261003T090000Z',
        'DTEND:20261003T093000Z',
        'DESCRIPTION:Join here https://teams.microsoft.com/l/meeting/19:meeting_desc@thread.v2 now',
        'END:VEVENT',
      ]),
      WINDOW.since,
      WINDOW.until,
    )[0]!;
    expect(fromDescription.joinUrl).toContain('meeting_desc');
  });
});

describe('parseIcs — folded lines + escaped characters', () => {
  it('unfolds continuation lines (leading space) and unescapes text', () => {
    // RFC 5545 line folding: a long SUMMARY split across lines with a leading space.
    const content = ics([
      'BEGIN:VEVENT',
      'UID:folded-1',
      'SUMMARY:Quarterly planning',
      '  and budget review\\, part 2',
      'DTSTART:20261004T140000Z',
      'DTEND:20261004T150000Z',
      'END:VEVENT',
    ]);
    const e = parseIcs(content, WINDOW.since, WINDOW.until)[0]!;
    expect(e.title).toBe('Quarterly planning and budget review, part 2');
  });
});

describe('parseIcs — TZID vs UTC handling', () => {
  it('applies a known TZID offset (India Standard Time, +5:30) to a floating time', () => {
    const content = ics([
      'BEGIN:VEVENT',
      'UID:tzid-1',
      'SUMMARY:IST meeting',
      'DTSTART;TZID=India Standard Time:20261005T153000',
      'DTEND;TZID=India Standard Time:20261005T163000',
      'END:VEVENT',
    ]);
    const e = parseIcs(content, WINDOW.since, WINDOW.until)[0]!;
    // 15:30 IST = 10:00 UTC.
    expect(e.start).toBe('2026-10-05T10:00:00.000Z');
    expect(e.end).toBe('2026-10-05T11:00:00.000Z');
  });

  it('treats a trailing Z as UTC regardless of any TZID guess', () => {
    const e = parseIcs(
      ics([
        'BEGIN:VEVENT',
        'UID:z-1',
        'SUMMARY:Z meeting',
        'DTSTART:20261006T080000Z',
        'DTEND:20261006T083000Z',
        'END:VEVENT',
      ]),
      WINDOW.since,
      WINDOW.until,
    )[0]!;
    expect(e.start).toBe('2026-10-06T08:00:00.000Z');
  });
});

describe('parseIcs — multiple events, ordering + window filtering', () => {
  it('returns multiple events sorted by start and drops out-of-window events', () => {
    const content = ics([
      'BEGIN:VEVENT',
      'UID:m-2',
      'SUMMARY:Later',
      'DTSTART:20261010T120000Z',
      'DTEND:20261010T130000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:m-1',
      'SUMMARY:Earlier',
      'DTSTART:20261008T120000Z',
      'DTEND:20261008T130000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:m-out',
      'SUMMARY:Out of window',
      'DTSTART:20271008T120000Z',
      'DTEND:20271008T130000Z',
      'END:VEVENT',
    ]);
    const events = parseIcs(content, WINDOW.since, WINDOW.until);
    expect(events.map((e) => e.externalCalendarId)).toEqual(['m-1', 'm-2']);
  });
});

describe('parseIcs — simple recurring events (documented scope)', () => {
  it('expands a DAILY RRULE to the occurrences within the window', () => {
    const content = ics([
      'BEGIN:VEVENT',
      'UID:daily-1',
      'SUMMARY:Daily standup',
      'DTSTART:20261001T090000Z',
      'DTEND:20261001T091500Z',
      'RRULE:FREQ=DAILY;COUNT=3',
      'END:VEVENT',
    ]);
    const events = parseIcs(content, WINDOW.since, WINDOW.until);
    // 3 occurrences: base UID + 2 occurrence-specific ids.
    expect(events).toHaveLength(3);
    expect(events[0]!.externalCalendarId).toBe('daily-1');
    expect(events.map((e) => e.start)).toEqual([
      '2026-10-01T09:00:00.000Z',
      '2026-10-02T09:00:00.000Z',
      '2026-10-03T09:00:00.000Z',
    ]);
    // Occurrence ids are distinct so sync stays idempotent yet per-instance.
    expect(new Set(events.map((e) => e.externalCalendarId)).size).toBe(3);
  });

  it('does NOT expand an unsupported FREQ (MONTHLY) — base occurrence only (limitation)', () => {
    const content = ics([
      'BEGIN:VEVENT',
      'UID:monthly-1',
      'SUMMARY:Monthly review',
      'DTSTART:20261001T090000Z',
      'DTEND:20261001T100000Z',
      'RRULE:FREQ=MONTHLY;COUNT=6',
      'END:VEVENT',
    ]);
    const events = parseIcs(content, WINDOW.since, WINDOW.until);
    expect(events).toHaveLength(1);
    expect(events[0]!.externalCalendarId).toBe('monthly-1');
  });
});

describe('parseIcs — robustness', () => {
  it('returns [] for an invalid window', () => {
    expect(parseIcs(ics([]), 'bad', 'bad')).toEqual([]);
  });
  it('skips VEVENTs missing UID or DTSTART', () => {
    const content = ics([
      'BEGIN:VEVENT',
      'SUMMARY:No uid',
      'DTSTART:20261002T100000Z',
      'END:VEVENT',
    ]);
    expect(parseIcs(content, WINDOW.since, WINDOW.until)).toEqual([]);
  });
});

describe('normalizeIcsUrl', () => {
  it('rewrites webcal:// to https:// and leaves http(s) untouched', () => {
    expect(normalizeIcsUrl('webcal://host/x.ics')).toBe('https://host/x.ics');
    expect(normalizeIcsUrl('https://host/x.ics')).toBe('https://host/x.ics');
  });
});

describe('createCalendarProvider — ICS selection', () => {
  it('returns Mock by default (no URL, no token)', () => {
    expect(createCalendarProvider().name).toBe('mock');
  });

  it('returns the ICS provider when provider=ics AND a URL is configured', () => {
    const p = createCalendarProvider({ provider: 'ics', icsCalendarUrl: 'https://host/x.ics' });
    expect(p.name).toBe('ics');
    expect(calendarProviderStatus({ provider: 'ics', icsCalendarUrl: 'https://host/x.ics' })).toEqual(
      { provider: 'ics', connected: true },
    );
  });

  it('stays Mock when provider=ics but NO URL is configured', () => {
    expect(createCalendarProvider({ provider: 'ics' }).name).toBe('mock');
  });

  it('a per-user URL activates ICS even without provider=ics (user opted in)', () => {
    const p = createCalendarProvider({ userIcsCalendarUrl: 'https://host/mine.ics' });
    expect(p.name).toBe('ics');
  });
});

describe('IcsCalendarProvider — fetches + parses a feed (fetch stubbed, NO network)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetches the feed URL and returns parsed events', async () => {
    const feed = ics([
      'BEGIN:VEVENT',
      'UID:feed-1',
      'SUMMARY:Feed meeting',
      'DTSTART:20261007T100000Z',
      'DTEND:20261007T110000Z',
      'X-MICROSOFT-SKYPETEAMSMEETINGURL:https://teams.microsoft.com/l/meetup-join/19:meeting_feed@thread.v2',
      'END:VEVENT',
    ]);
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(feed, { status: 200, headers: { 'content-type': 'text/calendar' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new IcsCalendarProvider({ url: 'webcal://host/cal.ics' });
    const events = await provider.listUpcomingMeetings(WINDOW.since, WINDOW.until);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // webcal:// normalized to https:// before fetch.
    expect(String(fetchMock.mock.calls[0]![0])).toBe('https://host/cal.ics');
    expect(events).toHaveLength(1);
    expect(events[0]!.externalCalendarId).toBe('feed-1');
    expect(events[0]!.teamsMeetingId).toBe('19:meeting_feed@thread.v2');
  });

  it('throws when constructed without a URL (no covert default)', () => {
    expect(() => new IcsCalendarProvider({ url: '' })).toThrow();
  });
});
