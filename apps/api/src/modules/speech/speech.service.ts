import type { SynthesizeResult, TranscribeResult } from '@vaani/types';
import { SUPPORTED_TRANSCRIBE_MIME_TYPES } from '@vaani/types';
import { ProviderHttpError, type TranscribeOptions } from '@vaani/ai';
import { getSttProvider, getTtsProvider } from '../../lib/ai.js';
import { ApiException } from '../../lib/errors.js';

/** Matches an `audio/*` or `video/*` data-URL prefix, capturing the MIME type. */
const DATA_URL_MIME = /^data:((?:audio|video)\/[\w.+-]+);base64,/;

/**
 * Strips an optional `data:audio/...;base64,` / `data:video/...;base64,` prefix and decodes to
 * an ArrayBuffer.
 */
function decodeAudio(input: string): ArrayBuffer {
  const base64 = input.replace(DATA_URL_MIME, '').replace(/\s+/g, '');
  const buf = Buffer.from(base64, 'base64');
  if (buf.length === 0) throw ApiException.badRequest('Audio payload is empty or invalid');
  // Return a standalone ArrayBuffer slice (avoids leaking the pooled Buffer backing store).
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** Extracts the MIME type from an `audio`/`video` data-URL prefix, if present. */
function mimeFromDataUrl(input: string): string | undefined {
  return DATA_URL_MIME.exec(input)?.[1]?.toLowerCase();
}

/**
 * Resolves the recording's real MIME type (an explicit `mimeType` wins, else the data-URL's
 * prefix) and validates it against the supported allow-list. Returns the STT format hint, or
 * throws a 422 for a clearly unsupported container. Unknown/absent → undefined (provider
 * falls back to its default filename), preserving backward compatibility.
 */
function resolveTranscribeOptions(audio: string, mimeType?: string): TranscribeOptions | undefined {
  const mime = mimeType?.trim().toLowerCase() || mimeFromDataUrl(audio);
  if (!mime) return undefined;
  if (!(SUPPORTED_TRANSCRIBE_MIME_TYPES as readonly string[]).includes(mime)) {
    throw ApiException.validation(`Unsupported audio format: ${mime}`);
  }
  return { mimeType: mime };
}

/** Maps a provider HTTP failure to a clean 502 rather than a raw 500. */
function toApiError(err: unknown): never {
  if (err instanceof ProviderHttpError) {
    throw new ApiException('INTERNAL', 'The speech provider is temporarily unavailable');
  }
  throw err;
}

export const speechService = {
  /** Transcribes provided audio via the configured STT provider (mock by default). */
  async transcribe(
    audio: string,
    languageCode?: string,
    mimeType?: string,
  ): Promise<TranscribeResult> {
    const provider = getSttProvider();
    // Resolve + validate the container BEFORE decoding, so an unsupported format is a clean 422.
    const options = resolveTranscribeOptions(audio, mimeType);
    try {
      const result = await provider.transcribe(decodeAudio(audio), languageCode, options);
      return { text: result.text, confidence: result.confidence, provider: provider.name };
    } catch (err) {
      return toApiError(err);
    }
  },

  /** Synthesizes speech via the configured TTS provider; returns base64 audio. */
  async synthesize(text: string, languageCode?: string): Promise<SynthesizeResult> {
    const provider = getTtsProvider();
    try {
      const result = await provider.synthesize(text, languageCode);
      const audio = Buffer.from(result.audio).toString('base64');
      return { audio, mimeType: result.mimeType, provider: provider.name };
    } catch (err) {
      return toApiError(err);
    }
  },
};

export { decodeAudio, resolveTranscribeOptions };
