/**
 * The meeting-capture abstraction (Local/AVD path). Feature code depends ONLY on
 * this interface. REAL audio capture is DEFERRED — this environment cannot capture
 * audio — so the shipped {@link LocalAudioCaptureProvider} models capture *state*
 * transitions only. Capture is consent-gated and user-visible (CLAUDE.md §13–14):
 * a provider must never start covertly.
 *
 * There is deliberately NO Graph/Teams recording-retrieval capture provider — capture
 * is the Local/AVD path only, per scope.
 */

/** Capture lifecycle state (state-only; no bytes are recorded in this environment). */
export type CaptureState = 'IDLE' | 'CAPTURING' | 'STOPPED';

export interface CaptureCapability {
  /** Whether real audio capture is available here. Always false in this environment. */
  audioSupported: boolean;
  /** Human-readable reason surfaced to the user when capture is unavailable. */
  reason: string;
}

export interface CaptureStartOptions {
  meetingId: string;
  /**
   * Explicit user consent to capture. A provider MUST refuse to start without this —
   * there is no covert capture path (CLAUDE.md §14). Enforced by the provider.
   */
  consent: boolean;
}

export interface CaptureStartResult {
  state: CaptureState;
  /** True when capture actually began (always false while real capture is deferred). */
  started: boolean;
  message: string;
}

export interface CaptureStopResult {
  state: CaptureState;
  durationSeconds: number;
}

export interface MeetingCaptureProvider {
  readonly name: string;
  /** Reports whether real capture is available in this environment. */
  capability(): CaptureCapability;
  /** Starts capture. Rejects when consent is not granted (never covert). */
  start(options: CaptureStartOptions): Promise<CaptureStartResult>;
  /** Stops capture and returns the final state. */
  stop(meetingId: string): Promise<CaptureStopResult>;
}
