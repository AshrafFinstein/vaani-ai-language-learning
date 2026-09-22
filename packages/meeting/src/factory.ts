import type { MeetingAnalysisProvider, MeetingTranscriptProvider } from './types.js';
import { MockMeetingAnalysisProvider } from './mock-analyzer.js';
import { MockMeetingTranscriptProvider } from './mock-transcript.js';

export interface MeetingProviderEnv {
  /** 'mock' today; a real STT/LLM-backed provider is a future phase. */
  provider?: string;
}

/**
 * Selects the meeting analysis provider. Defaults to the Mock so local dev and
 * tests never need credentials, network access, or real capture — mirroring the
 * `@vaani/ai` factory pattern.
 */
export function createMeetingAnalysisProvider(_env: MeetingProviderEnv = {}): MeetingAnalysisProvider {
  return new MockMeetingAnalysisProvider();
}

/** Selects the (mock) transcript generator. No real audio capture happens. */
export function createMeetingTranscriptProvider(_env: MeetingProviderEnv = {}): MeetingTranscriptProvider {
  return new MockMeetingTranscriptProvider();
}
