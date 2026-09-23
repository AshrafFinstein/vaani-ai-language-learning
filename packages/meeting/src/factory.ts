import type { MeetingAnalysisProvider, MeetingTranscriptProvider } from './types.js';
import { MockMeetingAnalysisProvider } from './mock-analyzer.js';
import { MockMeetingTranscriptProvider } from './mock-transcript.js';
import { OpenAIMeetingAnalysisProvider } from './openai-analyzer.js';

export interface MeetingProviderEnv {
  /** 'mock' (default) | 'openai'. */
  provider?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  /** Degrade to the deterministic Mock analyzer on transient OpenAI failure (opt-in). */
  fallbackToMock?: boolean;
}

/**
 * Selects the meeting analysis provider. Returns the REAL OpenAI-backed analyzer ONLY
 * when `provider === 'openai'` AND a key is present; otherwise the deterministic Mock,
 * so local dev and tests never need credentials, network access, or real capture —
 * mirroring the `@vaani/ai` factory pattern.
 */
export function createMeetingAnalysisProvider(env: MeetingProviderEnv = {}): MeetingAnalysisProvider {
  if ((env.provider ?? 'mock').toLowerCase() === 'openai' && env.openaiApiKey) {
    return new OpenAIMeetingAnalysisProvider({
      apiKey: env.openaiApiKey,
      baseUrl: env.openaiBaseUrl,
      model: env.openaiModel,
      fallbackToMock: env.fallbackToMock,
    });
  }
  return new MockMeetingAnalysisProvider();
}

/** Selects the (mock) transcript generator. No real audio capture happens. */
export function createMeetingTranscriptProvider(_env: MeetingProviderEnv = {}): MeetingTranscriptProvider {
  return new MockMeetingTranscriptProvider();
}
