import { fetchWithRetry, type HttpHardeningOptions } from '@vaani/ai';
import type { CalendarEventDTO } from '@vaani/types';
import type { CalendarProvider } from './types.js';
import { parseIcs } from './ics-parser.js';

export interface IcsCalendarConfig {
  /**
   * A published, read-only ICS feed URL (Outlook "Publish this calendar" link, or any
   * `webcal:`/`https:` .ics endpoint). No Azure app registration / admin consent is
   * required — this is the AVD-friendly path. Vaani only ever READS the feed.
   */
  url: string;
  hardening?: HttpHardeningOptions;
}

/**
 * READ-ONLY calendar provider backed by a published ICS feed (RFC 5545). This is the
 * admin-free alternative to the Microsoft Graph {@link OutlookCalendarProvider}: on a
 * locked-down Azure Virtual Desktop the user cannot do the Graph app registration, but
 * they CAN publish their Outlook calendar as an ICS URL. The feed is fetched with the
 * hardened {@link fetchWithRetry} (timeout + bounded backoff) and parsed by the
 * dependency-free {@link parseIcs}.
 *
 * `webcal://` URLs are normalized to `https://`. No secrets live here — the feed URL is
 * passed in via config (per-user or env). Vaani never writes back to the calendar.
 */
export class IcsCalendarProvider implements CalendarProvider {
  readonly name = 'ics' as const;
  private readonly url: string;

  constructor(private readonly config: IcsCalendarConfig) {
    if (!config.url) {
      throw new Error('IcsCalendarProvider requires an ICS feed URL (set ICS_CALENDAR_URL).');
    }
    this.url = normalizeIcsUrl(config.url);
  }

  async listUpcomingMeetings(sinceIso: string, untilIso: string): Promise<CalendarEventDTO[]> {
    const res = await fetchWithRetry(
      'IcsCalendar',
      this.url,
      { method: 'GET', headers: { Accept: 'text/calendar, text/plain, */*' } },
      this.config.hardening,
    );
    const content = await res.text();
    return parseIcs(content, sinceIso, untilIso);
  }
}

/**
 * Parses ICS *content* (already-fetched text, e.g. an uploaded `.ics` file) into
 * normalized events within the window. Used by the file-import path — no network.
 */
export function parseIcsContent(
  content: string,
  sinceIso: string,
  untilIso: string,
): CalendarEventDTO[] {
  return parseIcs(content, sinceIso, untilIso);
}

/** Normalizes a `webcal://` feed URL to `https://`; leaves http(s) URLs untouched. */
export function normalizeIcsUrl(url: string): string {
  const trimmed = url.trim();
  if (/^webcal:\/\//i.test(trimmed)) return trimmed.replace(/^webcal:\/\//i, 'https://');
  return trimmed;
}
