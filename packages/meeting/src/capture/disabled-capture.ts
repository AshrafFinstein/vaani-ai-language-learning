import {
  MeetingCaptureDisabledError,
  type CapturedMeetingMetadata,
  type CapturedParticipant,
  type CapturedRecording,
  type CapturedTranscript,
  type MeetingCaptureProvider,
} from './types.js';

/**
 * The default capture provider when no real capture is enabled. Every method throws a
 * clear {@link MeetingCaptureDisabledError} so the app NEVER mistakes "disabled" for a
 * successful (fake) Teams capture. The existing mock-transcript pipeline is used instead.
 */
export class DisabledMeetingCaptureProvider implements MeetingCaptureProvider {
  readonly name = 'disabled';

  constructor(private readonly reason = 'Meeting capture is disabled (set MEETING_CAPTURE_GRAPH=true).') {}

  isConfigured(): boolean {
    return false;
  }
  getMeetingMetadata(): Promise<CapturedMeetingMetadata> {
    return Promise.reject(new MeetingCaptureDisabledError(this.reason));
  }
  getParticipants(): Promise<CapturedParticipant[]> {
    return Promise.reject(new MeetingCaptureDisabledError(this.reason));
  }
  getTranscript(): Promise<CapturedTranscript> {
    return Promise.reject(new MeetingCaptureDisabledError(this.reason));
  }
  getRecording(): Promise<CapturedRecording> {
    return Promise.reject(new MeetingCaptureDisabledError(this.reason));
  }
}
