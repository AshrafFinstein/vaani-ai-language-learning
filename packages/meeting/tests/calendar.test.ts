import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MockCalendarProvider,
  OutlookCalendarProvider,
  createCalendarProvider,
  calendarProviderStatus,
} from '../src/index.js';

describe('createCalendarProvider — Mock by default, Outlook only when selected + token', () => {
  it('returns the Mock provider by default (offline, no token)', () => {
    expect(createCalendarProvider().name).toBe('mock');
    expect(createCalendarProvider({ provider: 'mock' }).name).toBe('mock');
  });

  it('returns the Mock provider when outlook is selected but NO token is configured', () => {
    expect(createCalendarProvider({ provider: 'outlook' }).name).toBe('mock');
  });

  it('returns the real Outlook provider ONLY when outlook is selected AND a token is present', () => {
    const p = createCalendarProvider({ provider: 'outlook', graphAccessToken: 'tok' });
    expect(p.name).toBe('outlook');
  });

  it('reports connection status correctly', () => {
    expect(calendarProviderStatus()).toEqual({ provider: 'mock', connected: false });
    expect(calendarProviderStatus({ provider: 'outlook', graphAccessToken: 'tok' })).toEqual({
      provider: 'outlook',
      connected: true,
    });
  });
});

describe('MockCalendarProvider — deterministic in-window sample events', () => {
  it('returns events anchored to the window start, all within the window', async () => {
    const since = '2026-10-01T09:00:00.000Z';
    const until = '2026-10-01T21:00:00.000Z';
    const events = await new MockCalendarProvider().listUpcomingMeetings(since, until);
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(new Date(e.start).getTime()).toBeGreaterThanOrEqual(new Date(since).getTime());
      expect(new Date(e.start).getTime()).toBeLessThanOrEqual(new Date(until).getTime());
    }
    // Deterministic ids for idempotent sync.
    expect(events[0]!.externalCalendarId).toBe('mock-event-1');
  });

  it('returns [] for an invalid window', async () => {
    expect(await new MockCalendarProvider().listUpcomingMeetings('bad', 'bad')).toEqual([]);
  });
});

describe('OutlookCalendarProvider — builds a hardened Graph request (fetch stubbed, NO network)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls /me/calendarView with the bearer token and parses Teams join URL', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          value: [
            {
              id: 'evt-1',
              subject: 'Sprint Review',
              start: { dateTime: '2026-10-01T10:00:00.0000000', timeZone: 'UTC' },
              end: { dateTime: '2026-10-01T11:00:00.0000000', timeZone: 'UTC' },
              onlineMeeting: { joinUrl: 'https://teams.microsoft.com/l/meetup-join/19:meeting_abc@thread.v2' },
              organizer: { emailAddress: { name: 'Priya', address: 'priya@x.com' } },
              attendees: [{ emailAddress: { name: 'Alex', address: 'alex@x.com' } }],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OutlookCalendarProvider({ accessToken: 'secret-token' });
    const events = await provider.listUpcomingMeetings(
      '2026-10-01T00:00:00Z',
      '2026-10-02T00:00:00Z',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/me/calendarView');
    expect(String(url)).toContain('startDateTime=');
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-token');

    expect(events).toHaveLength(1);
    expect(events[0]!.externalCalendarId).toBe('evt-1');
    expect(events[0]!.title).toBe('Sprint Review');
    expect(events[0]!.joinUrl).toContain('teams.microsoft.com');
    expect(events[0]!.teamsMeetingId).toBe('19:meeting_abc@thread.v2');
    expect(events[0]!.organizer).toEqual({ name: 'Priya', email: 'priya@x.com' });
  });

  it('throws when constructed without a token (no covert default)', () => {
    expect(() => new OutlookCalendarProvider({ accessToken: '' })).toThrow();
  });
});
