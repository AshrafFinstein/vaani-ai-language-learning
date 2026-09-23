import {
  MeetingCaptureUnsupportedError,
  type LocalAudioCaptureOptions,
  type LocalAudioCaptureProvider,
  type LocalAudioCaptureResult,
  type LocalCaptureState,
} from './types.js';

/**
 * Scaffold for LOCAL / AVD audio capture (microphone + system/meeting audio). Real
 * device capture is a desktop/AVD-agent concern that requires environment validation
 * and OS/org audio permissions — it is intentionally NOT implemented on the server.
 *
 * This class provides the contract and honest "unsupported here" behavior so callers
 * can detect capability via {@link isSupported} and degrade gracefully. It must never
 * be conflated with official Teams recording/transcript retrieval (that is the Graph
 * capture provider). It also never performs covert capture.
 */
export class UnsupportedLocalAudioCaptureProvider implements LocalAudioCaptureProvider {
  readonly name = 'local-unsupported';
  private state: LocalCaptureState = 'IDLE';

  isSupported(): boolean {
    return false;
  }
  getState(): LocalCaptureState {
    return this.state;
  }
  start(_options?: LocalAudioCaptureOptions): Promise<void> {
    this.state = 'ERROR';
    return Promise.reject(
      new MeetingCaptureUnsupportedError(
        'Local/AVD audio capture is not available in this environment. It requires a desktop/AVD capture agent with OS audio permissions (a later, environment-validated phase).',
      ),
    );
  }
  stop(): Promise<LocalAudioCaptureResult> {
    return Promise.reject(
      new MeetingCaptureUnsupportedError('Local audio capture is not available in this environment.'),
    );
  }
}
