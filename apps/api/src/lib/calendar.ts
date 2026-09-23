import {
  createCalendarProvider,
  calendarProviderStatus,
  createCaptureProvider,
  type CalendarProvider,
  type CalendarProviderEnv,
  type MeetingCaptureProvider,
} from '@vaani/meeting';
import type { CalendarProviderKind } from '@vaani/types';
import { env } from '../env.js';

/** Maps backend env → the calendar provider-abstraction env shape (no secrets leak). */
function calendarEnv(): CalendarProviderEnv {
  return {
    provider: env.CALENDAR_PROVIDER,
    graphAccessToken: env.MS_GRAPH_ACCESS_TOKEN,
    graphBaseUrl: env.MS_GRAPH_BASE_URL,
  };
}

/**
 * Constructs the calendar provider from env. Not cached — a token could rotate — and
 * cheap to build. Returns the real Outlook provider ONLY when CALENDAR_PROVIDER=outlook
 * AND a token is configured; otherwise the deterministic Mock.
 */
export function getCalendarProvider(): CalendarProvider {
  return createCalendarProvider(calendarEnv());
}

/** Reports which calendar backend is active + whether it is a real connection. */
export function getCalendarStatus(): { provider: CalendarProviderKind; connected: boolean } {
  return calendarProviderStatus(calendarEnv());
}

let captureProvider: MeetingCaptureProvider | undefined;

/** The Local/AVD capture provider (state-only; real capture deferred). */
export function getCaptureProvider(): MeetingCaptureProvider {
  if (!captureProvider) captureProvider = createCaptureProvider();
  return captureProvider;
}
