import type { CalendarProviderKind } from '@vaani/types';
import type { CalendarProvider } from './types.js';
import { MockCalendarProvider } from './mock-calendar.js';
import { OutlookCalendarProvider } from './outlook-calendar.js';

export interface CalendarProviderEnv {
  /** 'mock' (default) | 'outlook'. */
  provider?: string;
  /** Microsoft Graph delegated bearer token — required to activate Outlook. */
  graphAccessToken?: string;
  /** Graph base URL, default https://graph.microsoft.com/v1.0. */
  graphBaseUrl?: string;
}

/**
 * Selects the calendar provider. Returns the REAL Outlook (Graph) provider ONLY when
 * `provider === 'outlook'` AND a token is configured; otherwise the deterministic Mock,
 * so the suite runs offline with no token or network. Mirrors the `@vaani/ai` factory.
 */
export function createCalendarProvider(env: CalendarProviderEnv = {}): CalendarProvider {
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
  const outlook = (env.provider ?? 'mock').toLowerCase() === 'outlook' && Boolean(env.graphAccessToken);
  return outlook ? { provider: 'outlook', connected: true } : { provider: 'mock', connected: false };
}
