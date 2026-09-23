import type {
  SpeechToTextProvider,
  SpeechToTextResult,
  TextToSpeechProvider,
  TextToSpeechResult,
} from './types.js';
import { fetchWithRetry, type HttpHardeningOptions } from './http.js';

export interface OpenAISpeechConfig {
  apiKey: string;
  baseUrl?: string;
  hardening?: HttpHardeningOptions;
}

export interface OpenAISttConfig extends OpenAISpeechConfig {
  /** Whisper model. Defaults to "whisper-1". */
  model?: string;
}

export interface OpenAITtsConfig extends OpenAISpeechConfig {
  /** TTS model. Defaults to "tts-1". */
  model?: string;
  /** Voice name, e.g. "alloy". Defaults to "alloy". */
  voice?: string;
  /** Output format; drives the returned mimeType. Defaults to "mp3". */
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

const FORMAT_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  opus: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wav: 'audio/wav',
  pcm: 'audio/pcm',
};

/**
 * Real speech-to-text via OpenAI Whisper (`POST {baseUrl}/audio/transcriptions`,
 * multipart form-data). Implements {@link SpeechToTextProvider} so feature code
 * stays vendor-agnostic. Shares the timeout/retry/typed-error hardening used by the
 * text provider. NO key is embedded — it is passed in from backend env.
 */
export class OpenAISttProvider implements SpeechToTextProvider {
  readonly name = 'openai';
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly config: OpenAISttConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAISttProvider requires an API key (set OPENAI_API_KEY on the backend).');
    }
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = config.model ?? 'whisper-1';
  }

  async transcribe(audio: ArrayBuffer, languageCode?: string): Promise<SpeechToTextResult> {
    const form = new FormData();
    // Whisper accepts common audio containers; the filename hints the type only.
    form.append('file', new Blob([audio]), 'audio.webm');
    form.append('model', this.model);
    // response_format=verbose_json surfaces language/segments when available.
    form.append('response_format', 'json');
    if (languageCode) form.append('language', languageCode);

    const res = await fetchWithRetry(
      'OpenAI STT',
      `${this.baseUrl}/audio/transcriptions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        body: form,
      },
      this.config.hardening,
    );

    const data = (await res.json()) as { text?: string };
    return { text: (data.text ?? '').trim(), confidence: 1 };
  }
}

/**
 * Real text-to-speech via OpenAI (`POST {baseUrl}/audio/speech`). Implements
 * {@link TextToSpeechProvider}; returns raw audio bytes + mimeType in the existing
 * {@link TextToSpeechResult} shape. Shares the timeout/retry/typed-error hardening.
 */
export class OpenAITtsProvider implements TextToSpeechProvider {
  readonly name = 'openai';
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly voice: string;
  private readonly format: NonNullable<OpenAITtsConfig['format']>;

  constructor(private readonly config: OpenAITtsConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAITtsProvider requires an API key (set OPENAI_API_KEY on the backend).');
    }
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = config.model ?? 'tts-1';
    this.voice = config.voice ?? 'alloy';
    this.format = config.format ?? 'mp3';
  }

  async synthesize(text: string, _languageCode?: string): Promise<TextToSpeechResult> {
    const res = await fetchWithRetry(
      'OpenAI TTS',
      `${this.baseUrl}/audio/speech`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          voice: this.voice,
          input: text,
          response_format: this.format,
        }),
      },
      this.config.hardening,
    );

    const audio = await res.arrayBuffer();
    return { audio, mimeType: FORMAT_MIME[this.format] ?? 'audio/mpeg' };
  }
}
