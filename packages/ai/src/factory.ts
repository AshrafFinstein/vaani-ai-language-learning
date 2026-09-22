import type { AIProvider, SpeechToTextProvider, TextToSpeechProvider } from './types.js';
import { MockAIProvider, MockSttProvider, MockTtsProvider } from './mock.js';
import { OpenAIProvider } from './openai.js';

export interface AIProviderEnv {
  provider?: string; // 'mock' | 'openai'
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

/**
 * Selects the AI provider from configuration. Defaults to the Mock provider so
 * local development and tests never require credentials or network access.
 */
export function createAIProvider(env: AIProviderEnv): AIProvider {
  switch ((env.provider ?? 'mock').toLowerCase()) {
    case 'openai':
      return new OpenAIProvider({
        apiKey: env.openaiApiKey ?? '',
        baseUrl: env.openaiBaseUrl,
      });
    case 'mock':
    default:
      return new MockAIProvider();
  }
}

export function createSttProvider(_env: AIProviderEnv): SpeechToTextProvider {
  // Only the mock is available until the Voice/Call phase.
  return new MockSttProvider();
}

export function createTtsProvider(_env: AIProviderEnv): TextToSpeechProvider {
  return new MockTtsProvider();
}
