export * from './types.js';
export { MockMeetingAnalysisProvider } from './mock-analyzer.js';
export { MockMeetingTranscriptProvider } from './mock-transcript.js';
export { OpenAIMeetingAnalysisProvider } from './openai-analyzer.js';
export {
  createMeetingAnalysisProvider,
  createMeetingTranscriptProvider,
  type MeetingProviderEnv,
} from './factory.js';

// ── Calendar (real Outlook read-only when configured; Mock default) ──────────
export type { CalendarProvider } from './calendar/types.js';
export { MockCalendarProvider } from './calendar/mock-calendar.js';
export {
  OutlookCalendarProvider,
  type OutlookCalendarConfig,
} from './calendar/outlook-calendar.js';
export {
  createCalendarProvider,
  calendarProviderStatus,
  type CalendarProviderEnv,
} from './calendar/factory.js';

// ── Capture (Local/AVD path only; state-only, real capture deferred) ─────────
export type {
  MeetingCaptureProvider,
  CaptureCapability,
  CaptureStartOptions,
  CaptureStartResult,
  CaptureStopResult,
  CaptureState,
} from './capture/types.js';
export { LocalAudioCaptureProvider } from './capture/local-audio-capture.js';
export { createCaptureProvider } from './capture/factory.js';

// ── Speaker mapping ──────────────────────────────────────────────────────────
export {
  SpeakerService,
  type SpeakerMapping,
  type SpeakerMappingParticipant,
} from './speaker.js';
