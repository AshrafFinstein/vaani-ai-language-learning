import type { SynthesizeResult, TranscribeResult } from '@vaani/types';
import { ProviderHttpError } from '@vaani/ai';
import { getSttProvider, getTtsProvider } from '../../lib/ai.js';
import { ApiException } from '../../lib/errors.js';

/** Strips an optional `data:audio/...;base64,` prefix and decodes to an ArrayBuffer. */
function decodeAudio(input: string): ArrayBuffer {
  const base64 = input.replace(/^data:audio\/[\w.+-]+;base64,/, '').replace(/\s+/g, '');
  const buf = Buffer.from(base64, 'base64');
  if (buf.length === 0) throw ApiException.badRequest('Audio payload is empty or invalid');
  // Return a standalone ArrayBuffer slice (avoids leaking the pooled Buffer backing store).
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
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
  async transcribe(audio: string, languageCode?: string): Promise<TranscribeResult> {
    const provider = getSttProvider();
    try {
      const result = await provider.transcribe(decodeAudio(audio), languageCode);
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

export { decodeAudio };
