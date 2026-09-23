import type { AIProvider, SpeechToTextProvider, TextToSpeechProvider } from './types.js';
import { MockAIProvider, MockSttProvider, MockTtsProvider } from './mock.js';
import { OpenAIProvider } from './openai.js';
import { OpenAISttProvider, OpenAITtsProvider } from './openai-speech.js';

export interface AIProviderEnv {
  provider?: string; // 'mock' | 'openai'
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  /** Chat model override (env OPENAI_MODEL). */
  openaiModel?: string;
  /** Graceful degrade to Mock on transient OpenAI failure (env AI_FALLBACK_TO_MOCK). */
  fallbackToMock?: boolean;
  /**
   * Optional dedicated speech provider selector (env SPEECH_PROVIDER). Falls back to
   * `provider` when unset, so `AI_PROVIDER=openai` also enables real speech.
   */
  speechProvider?: string;
  /** Whisper model (env OPENAI_STT_MODEL). */
  openaiSttModel?: string;
  /** TTS model (env OPENAI_TTS_MODEL). */
  openaiTtsModel?: string;
  /** TTS voice (env OPENAI_TTS_VOICE). */
  openaiTtsVoice?: string;
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
        model: env.openaiModel,
        fallbackToMock: env.fallbackToMock,
      });
    case 'mock':
    default:
      return new MockAIProvider();
  }
}

/** Resolves the speech provider selector: SPEECH_PROVIDER wins, else AI_PROVIDER. */
function resolveSpeechProvider(env: AIProviderEnv): string {
  return (env.speechProvider ?? env.provider ?? 'mock').toLowerCase();
}

/**
 * Selects the STT provider. Returns the real OpenAI Whisper provider only when the
 * selector is `openai` AND a key is present; otherwise the deterministic Mock, so the
 * suite runs offline with no key.
 */
export function createSttProvider(env: AIProviderEnv): SpeechToTextProvider {
  if (resolveSpeechProvider(env) === 'openai' && env.openaiApiKey) {
    return new OpenAISttProvider({
      apiKey: env.openaiApiKey,
      baseUrl: env.openaiBaseUrl,
      model: env.openaiSttModel,
    });
  }
  return new MockSttProvider();
}

/**
 * Selects the TTS provider. Returns the real OpenAI provider only when the selector is
 * `openai` AND a key is present; otherwise the Mock.
 */
export function createTtsProvider(env: AIProviderEnv): TextToSpeechProvider {
  if (resolveSpeechProvider(env) === 'openai' && env.openaiApiKey) {
    return new OpenAITtsProvider({
      apiKey: env.openaiApiKey,
      baseUrl: env.openaiBaseUrl,
      model: env.openaiTtsModel,
      voice: env.openaiTtsVoice,
    });
  }
  return new MockTtsProvider();
}
