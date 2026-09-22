import type { MeetingAnalysisDTO } from '@vaani/types';

/**
 * A single speaker-labelled utterance in a (mock) transcript. This is the ONLY
 * evidence a {@link MeetingAnalysisProvider} may use — it must never invent
 * participants, owners, deadlines, decisions, or action items beyond what these
 * segments support (CLAUDE.md §15).
 */
export interface TranscriptSegmentInput {
  speakerLabel: string;
  text: string;
  startMs: number;
  endMs: number;
}

/** A participant known at schedule time. The analyzer may reference these but never adds new ones. */
export interface KnownParticipant {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  speakerLabel: string | null;
}

export interface AnalyzeInput {
  meetingTitle: string;
  segments: TranscriptSegmentInput[];
  /** Participants supplied when the meeting was scheduled. */
  knownParticipants: KnownParticipant[];
}

/**
 * The core meeting-analysis abstraction. Feature code depends ONLY on this
 * interface, never on a concrete vendor, mirroring the `@vaani/ai` pattern.
 * A real STT/LLM-backed provider is a future phase; only the Mock exists today.
 */
export interface MeetingAnalysisProvider {
  readonly name: string;
  /** Turn a transcript into a schema-valid summary/decisions/action-items/participants. */
  analyze(input: AnalyzeInput): Promise<MeetingAnalysisDTO>;
}

/** Produces a deterministic mock transcript for a scheduled meeting (no real capture). */
export interface MeetingTranscriptProvider {
  readonly name: string;
  generate(input: {
    meetingTitle: string;
    knownParticipants: KnownParticipant[];
  }): Promise<{ segments: TranscriptSegmentInput[]; language: string }>;
}
