/**
 * Meeting CAPTURE abstractions — retrieving OFFICIAL meeting artifacts (metadata,
 * transcript, recording, participants) from an authorized source such as Microsoft
 * Graph. This is deliberately SEPARATE from analysis (`MeetingAnalysisProvider`) and
 * from mock transcript generation (`MeetingTranscriptProvider`).
 *
 * Hard rules (CLAUDE.md §14–15):
 *  - Never fabricate transcripts, recordings, or participants.
 *  - When disabled or unconfigured, throw a clear error — never return fake success.
 *  - Local/AVD audio capture is a DIFFERENT interface ({@link LocalAudioCaptureProvider})
 *    and must never be conflated with official Teams recording/transcript retrieval.
 */

/** Identifies a meeting within the capture source. */
export interface MeetingRef {
  /** Organizer user id / UPN — Graph addresses online meetings under a user. */
  organizerId: string;
  /** The onlineMeeting id. If absent, {@link joinWebUrl} is used to resolve it. */
  meetingId?: string;
  joinWebUrl?: string;
}

export interface CapturedMeetingMetadata {
  id: string;
  subject: string | null;
  provider: 'TEAMS' | 'AVD' | 'OTHER';
  startDateTime: string | null;
  endDateTime: string | null;
  joinWebUrl: string | null;
}

export interface CapturedParticipant {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface CapturedTranscriptSegment {
  speakerLabel: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface CapturedTranscript {
  language: string;
  segments: CapturedTranscriptSegment[];
  /** True when segments carry per-speaker labels (diarization present in the source). */
  diarized: boolean;
  /** Provenance, e.g. "graph:transcript". Never "mock" for a real provider. */
  source: string;
}

export interface CapturedRecording {
  /** URL/handle to the recording content, or null when none exists. NEVER fabricated. */
  contentUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  source: string;
}

/**
 * Retrieves official meeting artifacts from an authorized source. Implementations MUST
 * throw {@link MeetingCaptureDisabledError} / {@link MeetingCaptureConfigError} rather
 * than returning fabricated data.
 */
export interface MeetingCaptureProvider {
  readonly name: string;
  /** True only when enabled AND fully configured (all credentials present). */
  isConfigured(): boolean;
  getMeetingMetadata(ref: MeetingRef): Promise<CapturedMeetingMetadata>;
  getParticipants(ref: MeetingRef): Promise<CapturedParticipant[]>;
  getTranscript(ref: MeetingRef): Promise<CapturedTranscript>;
  getRecording(ref: MeetingRef): Promise<CapturedRecording>;
}

// ── Local / AVD audio capture (SEPARATE concern) ────────────────────────────────

export type LocalCaptureState = 'IDLE' | 'CAPTURING' | 'STOPPED' | 'ERROR';

export interface LocalAudioCaptureResult {
  audio: ArrayBuffer;
  mimeType: string;
  durationMs: number;
}

export interface LocalAudioCaptureOptions {
  /** OS audio input device id (microphone). */
  deviceId?: string;
  /** Capture system/meeting audio where technically available and authorized. */
  includeSystemAudio?: boolean;
}

/**
 * Local/AVD audio capture — microphone and (where available) system/meeting audio.
 * This is a device/desktop concern; the backend scaffold exposes the contract and a
 * clear "unsupported in this environment" implementation. A real capture agent is a
 * later, environment-validated phase.
 */
export interface LocalAudioCaptureProvider {
  readonly name: string;
  isSupported(): boolean;
  getState(): LocalCaptureState;
  start(options?: LocalAudioCaptureOptions): Promise<void>;
  stop(): Promise<LocalAudioCaptureResult>;
}

// ── Errors ──────────────────────────────────────────────────────────────────────

/** The feature flag is off — capture is intentionally inactive. */
export class MeetingCaptureDisabledError extends Error {
  constructor(message = 'Meeting capture is disabled.') {
    super(message);
    this.name = 'MeetingCaptureDisabledError';
  }
}

/** The feature is enabled but required credentials/config are missing or invalid. */
export class MeetingCaptureConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MeetingCaptureConfigError';
  }
}

/** The capability isn't available in the current environment (e.g. local capture on a server). */
export class MeetingCaptureUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MeetingCaptureUnsupportedError';
  }
}
