import type {
  SpeechToTextProvider,
  SpeechToTextResult,
  TextToSpeechProvider,
  TextToSpeechResult,
  TranscribeOptions,
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

/** Whisper-supported upload filenames keyed by container extension. */
const EXT_FILENAME: Record<string, string> = {
  webm: 'audio.webm',
  mp4: 'audio.mp4',
  m4a: 'audio.m4a',
  mp3: 'audio.mp3',
  mpga: 'audio.mp3',
  wav: 'audio.wav',
  mpeg: 'audio.mp3',
  ogg: 'audio.ogg',
  oga: 'audio.ogg',
  flac: 'audio.flac',
};

/** MIME type → Whisper upload filename. Covers the common recorder/container types. */
const MIME_FILENAME: Record<string, string> = {
  'audio/webm': 'audio.webm',
  'video/webm': 'audio.webm',
  'video/mp4': 'audio.mp4',
  'audio/mp4': 'audio.m4a',
  'audio/x-m4a': 'audio.m4a',
  'audio/m4a': 'audio.m4a',
  'audio/mpeg': 'audio.mp3',
  'audio/mp3': 'audio.mp3',
  'audio/wav': 'audio.wav',
  'audio/x-wav': 'audio.wav',
  'audio/wave': 'audio.wav',
  'audio/ogg': 'audio.ogg',
  'audio/flac': 'audio.flac',
  'audio/x-flac': 'audio.flac',
};

/**
 * Derives the Whisper upload filename from an optional format hint. Whisper detects the
 * container from the filename EXTENSION, so we map the caller's real filename/MIME to a
 * correct `audio.<ext>`. Prefers the filename's own extension, then the MIME type, and
 * defaults to `audio.webm` when neither is recognised (backward compatible).
 */
export function whisperUploadFilename(options?: TranscribeOptions): string {
  const ext = options?.filename?.split('.').pop()?.toLowerCase();
  if (ext && EXT_FILENAME[ext]) return EXT_FILENAME[ext];
  const mime = options?.mimeType?.trim().toLowerCase().split(';')[0];
  if (mime && MIME_FILENAME[mime]) return MIME_FILENAME[mime];
  return 'audio.webm';
}

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

  async transcribe(
    audio: ArrayBuffer,
    languageCode?: string,
    options?: TranscribeOptions,
  ): Promise<SpeechToTextResult> {
    const form = new FormData();
    // Whisper detects the container from the upload filename EXTENSION, so we derive a
    // correct `audio.<ext>` from the caller's format hint (defaults to audio.webm).
    form.append('file', new Blob([audio]), whisperUploadFilename(options));
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
