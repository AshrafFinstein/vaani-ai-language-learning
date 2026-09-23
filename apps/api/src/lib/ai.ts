import {
  createAIProvider,
  createSttProvider,
  createTtsProvider,
  type AIProvider,
  type AIProviderEnv,
  type SpeechToTextProvider,
  type TextToSpeechProvider,
} from '@vaani/ai';
import { env } from '../env.js';

let provider: AIProvider | undefined;
let sttProvider: SpeechToTextProvider | undefined;
let ttsProvider: TextToSpeechProvider | undefined;

/** Maps backend env → the provider-abstraction env shape (single place, no secrets leak). */
function providerEnv(): AIProviderEnv {
  return {
    provider: env.AI_PROVIDER,
    openaiApiKey: env.OPENAI_API_KEY,
    openaiBaseUrl: env.OPENAI_BASE_URL,
    openaiModel: env.OPENAI_MODEL,
    fallbackToMock: env.AI_FALLBACK_TO_MOCK,
    speechProvider: env.SPEECH_PROVIDER,
    openaiSttModel: env.OPENAI_STT_MODEL,
    openaiTtsModel: env.OPENAI_TTS_MODEL,
    openaiTtsVoice: env.OPENAI_TTS_VOICE,
  };
}

/**
 * Lazily-constructed AI provider selected from env (mock | openai).
 * Kept behind a getter so the API key never has to exist at import time in tests.
 */
export function getAIProvider(): AIProvider {
  if (!provider) provider = createAIProvider(providerEnv());
  return provider;
}

/** Lazily-constructed speech-to-text provider (Mock unless openai + key). */
export function getSttProvider(): SpeechToTextProvider {
  if (!sttProvider) sttProvider = createSttProvider(providerEnv());
  return sttProvider;
}

/** Lazily-constructed text-to-speech provider (Mock unless openai + key). */
export function getTtsProvider(): TextToSpeechProvider {
  if (!ttsProvider) ttsProvider = createTtsProvider(providerEnv());
  return ttsProvider;
}
