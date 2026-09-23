import type {
  CaptureCapability,
  CaptureStartOptions,
  CaptureStartResult,
  CaptureState,
  CaptureStopResult,
  MeetingCaptureProvider,
} from './types.js';

/**
 * Local/AVD audio capture provider — STATE ONLY. Real audio capture is DEFERRED:
 * this environment cannot capture audio, so this provider tracks the capture *state*
 * machine (IDLE → CAPTURING → STOPPED) without recording any bytes.
 *
 * Consent & no-covert-capture (CLAUDE.md §13–14): `start` REFUSES without explicit
 * consent, and `capability()` reports capture as unsupported so callers surface the
 * "capture deferred" state to the user rather than pretending to record.
 *
 * When a real deployment supplies already-recorded audio, the existing real-Whisper
 * STT path (`POST /api/meetings/:id/transcribe`) handles transcription — this provider
 * does not duplicate that; it only models the live-capture lifecycle.
 */
export class LocalAudioCaptureProvider implements MeetingCaptureProvider {
  readonly name = 'local-audio';
  private readonly states = new Map<string, CaptureState>();

  capability(): CaptureCapability {
    return {
      audioSupported: false,
      reason:
        'Live local/AVD audio capture is deferred in this environment. Capture state is modelled only; ' +
        'provide already-recorded audio to the transcribe endpoint for real STT.',
    };
  }

  async start(options: CaptureStartOptions): Promise<CaptureStartResult> {
    // Never covert: refuse to start without explicit consent (CLAUDE.md §14).
    if (!options.consent) {
      return {
        state: 'IDLE',
        started: false,
        message: 'Capture consent is required before local capture can start.',
      };
    }
    // Model the CAPTURING state without recording any real audio (deferred).
    this.states.set(options.meetingId, 'CAPTURING');
    return {
      state: 'CAPTURING',
      started: false,
      message:
        'Capture state set to CAPTURING (no audio recorded — real capture is deferred in this environment).',
    };
  }

  async stop(meetingId: string): Promise<CaptureStopResult> {
    this.states.set(meetingId, 'STOPPED');
    // No real capture ran, so no real duration is fabricated.
    return { state: 'STOPPED', durationSeconds: 0 };
  }
}
