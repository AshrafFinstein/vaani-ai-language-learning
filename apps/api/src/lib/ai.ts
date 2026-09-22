import { createAIProvider, type AIProvider } from '@vaani/ai';
import { env } from '../env.js';

let provider: AIProvider | undefined;

/**
 * Lazily-constructed AI provider selected from env (mock | openai).
 * Kept behind a getter so the API key never has to exist at import time in tests.
 */
export function getAIProvider(): AIProvider {
  if (!provider) {
    provider = createAIProvider({
      provider: env.AI_PROVIDER,
      openaiApiKey: env.OPENAI_API_KEY,
      openaiBaseUrl: env.OPENAI_BASE_URL,
    });
  }
  return provider;
}
