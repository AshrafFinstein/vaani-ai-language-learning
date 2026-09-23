import {
  createCalendarProvider,
  calendarProviderStatus,
  createLocalAudioCaptureProvider,
  type CalendarProvider,
  type CalendarProviderEnv,
  type LocalAudioCaptureProvider,
} from '@vaani/meeting';
import type { CalendarProviderKind } from '@vaani/types';
import { env } from '../env.js';

/**
 * Maps backend env → the calendar provider-abstraction env shape (no secrets leak).
 * `userIcsCalendarUrl` is the per-user published ICS feed (MeetingSettings); when set it
 * takes precedence over the env-level ICS_CALENDAR_URL and activates the admin-free path.
 */
function calendarEnv(userIcsCalendarUrl?: string | null): CalendarProviderEnv {
  return {
    provider: env.CALENDAR_PROVIDER,
    graphAccessToken: env.MS_GRAPH_ACCESS_TOKEN,
    graphBaseUrl: env.MS_GRAPH_BASE_URL,
    icsCalendarUrl: env.ICS_CALENDAR_URL,
    userIcsCalendarUrl: userIcsCalendarUrl ?? undefined,
  };
}

/**
 * Constructs the calendar provider from env (+ an optional per-user ICS URL). Not cached
 * — a token/URL could change — and cheap to build. Precedence: ICS (feed URL) → Outlook
 * (Graph token) → Mock (deterministic default, offline).
 */
export function getCalendarProvider(userIcsCalendarUrl?: string | null): CalendarProvider {
  return createCalendarProvider(calendarEnv(userIcsCalendarUrl));
}

/** Reports which calendar backend is active + whether it is a real connection. */
export function getCalendarStatus(userIcsCalendarUrl?: string | null): {
  provider: CalendarProviderKind;
  connected: boolean;
} {
  return calendarProviderStatus(calendarEnv(userIcsCalendarUrl));
}

let captureProvider: LocalAudioCaptureProvider | undefined;

/** The Local/AVD audio capture provider (unsupported on the server; real capture deferred). */
export function getCaptureProvider(): LocalAudioCaptureProvider {
  if (!captureProvider) captureProvider = createLocalAudioCaptureProvider();
  return captureProvider;
}
