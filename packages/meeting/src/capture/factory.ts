import type { MeetingCaptureProvider } from './types.js';
import { LocalAudioCaptureProvider } from './local-audio-capture.js';

/**
 * Selects the meeting-capture provider. Only the Local/AVD path exists (state-only;
 * real capture deferred). There is deliberately NO Graph/Teams recording-retrieval
 * capture provider — capture is the Local/AVD path only, per scope.
 */
export function createCaptureProvider(): MeetingCaptureProvider {
  return new LocalAudioCaptureProvider();
}
