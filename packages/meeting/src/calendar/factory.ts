import type { CalendarProviderKind } from '@vaani/types';
import type { CalendarProvider } from './types.js';
import { MockCalendarProvider } from './mock-calendar.js';
import { OutlookCalendarProvider } from './outlook-calendar.js';
import { IcsCalendarProvider } from './ics-calendar.js';

export interface CalendarProviderEnv {
  /** 'mock' (default) | 'outlook' | 'ics'. */
  provider?: string;
  /** Microsoft Graph delegated bearer token — required to activate Outlook. */
  graphAccessToken?: string;
  /** Graph base URL, default https://graph.microsoft.com/v1.0. */
  graphBaseUrl?: string;
  /** Published ICS feed URL from env (ICS_CALENDAR_URL) — the fallback ICS source. */
  icsCalendarUrl?: string;
  /**
   * A PER-USER ICS feed URL (from MeetingSettings). When present it takes precedence
   * over `icsCalendarUrl` and, if `provider` is unset, still activates the ICS path so
   * a user who pasted their own link gets their calendar without a global env change.
   */
  userIcsCalendarUrl?: string;
}

/** The effective ICS URL: per-user link wins over the env-level default. */
function effectiveIcsUrl(env: CalendarProviderEnv): string | undefined {
  return env.userIcsCalendarUrl?.trim() || env.icsCalendarUrl?.trim() || undefined;
}

/** True when the ICS provider should be active for this env (selected OR a user URL is set). */
function icsActive(env: CalendarProviderEnv): boolean {
  const provider = (env.provider ?? 'mock').toLowerCase();
  const url = effectiveIcsUrl(env);
  if (!url) return false;
  // Explicit selection, OR a per-user URL (which implies the user opted into ICS).
  return provider === 'ics' || Boolean(env.userIcsCalendarUrl?.trim());
}

/**
 * Selects the calendar provider. Precedence:
 *  1. ICS   — when a feed URL is configured AND (`provider === 'ics'` OR the user set
 *             their own `userIcsCalendarUrl`). Admin-free; no Graph token needed.
 *  2. Outlook (Graph) — when `provider === 'outlook'` AND a token is configured.
 *  3. Mock  — the deterministic default, so the suite runs offline with no token/URL.
 *
 * Mirrors the `@vaani/ai` factory: the real backend is opt-in, never covert.
 */
export function createCalendarProvider(env: CalendarProviderEnv = {}): CalendarProvider {
  if (icsActive(env)) {
    return new IcsCalendarProvider({ url: effectiveIcsUrl(env)! });
  }
  if ((env.provider ?? 'mock').toLowerCase() === 'outlook' && env.graphAccessToken) {
    return new OutlookCalendarProvider({
      accessToken: env.graphAccessToken,
      baseUrl: env.graphBaseUrl,
    });
  }
  return new MockCalendarProvider();
}

/** Reports which calendar backend is active + whether it is a real (connected) provider. */
export function calendarProviderStatus(env: CalendarProviderEnv = {}): {
  provider: CalendarProviderKind;
  connected: boolean;
} {
  if (icsActive(env)) return { provider: 'ics', connected: true };
  const outlook = (env.provider ?? 'mock').toLowerCase() === 'outlook' && Boolean(env.graphAccessToken);
  return outlook ? { provider: 'outlook', connected: true } : { provider: 'mock', connected: false };
}
