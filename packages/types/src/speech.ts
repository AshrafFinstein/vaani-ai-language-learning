import { z } from 'zod';

/**
 * Speech contracts (real STT/TTS on PROVIDED audio). Keys live only on the backend;
 * the provider abstraction (`@vaani/ai`) decides mock vs. real. Audio crosses the API
 * as base64 (optionally a data-URL) inside JSON, matching the existing photo/data-URL
 * convention — no multipart plumbing is introduced.
 */

/** Accepts raw base64 or a data-URL (`data:audio/webm;base64,...`). */
const base64Audio = z
  .string()
  .min(1, 'Audio is required')
  .max(20_000_000, 'Audio is too large')
  .refine(
    (v) => /^data:audio\/[\w.+-]+;base64,/.test(v) || /^[A-Za-z0-9+/=\s]+$/.test(v),
    'Audio must be base64 or a base64 audio data-URL',
  );

export const TranscribeInput = z.object({
  /** Base64 (or data-URL) encoded audio to transcribe. */
  audio: base64Audio,
  /** Optional BCP-47/ISO language hint, e.g. "en", "es". */
  languageCode: z.string().min(2).max(10).optional(),
});
export type TranscribeInput = z.infer<typeof TranscribeInput>;

export const TranscribeResult = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1),
  provider: z.string(),
});
export type TranscribeResult = z.infer<typeof TranscribeResult>;

export const SynthesizeInput = z.object({
  text: z.string().min(1, 'Text is required').max(4000, 'Text is too long'),
  languageCode: z.string().min(2).max(10).optional(),
});
export type SynthesizeInput = z.infer<typeof SynthesizeInput>;

export const SynthesizeResult = z.object({
  /** Base64-encoded audio bytes. */
  audio: z.string(),
  mimeType: z.string(),
  provider: z.string(),
});
export type SynthesizeResult = z.infer<typeof SynthesizeResult>;

/**
 * Transcribe a PROVIDED meeting-audio recording and feed the existing analysis
 * pipeline. This is NOT live capture — the caller supplies already-recorded audio
 * (consent-gated by the meeting's recording session). Live/covert capture stays
 * deferred (CLAUDE.md §14).
 */
export const MeetingTranscribeAudioInput = z.object({
  audio: base64Audio,
  languageCode: z.string().min(2).max(10).optional(),
});
export type MeetingTranscribeAudioInput = z.infer<typeof MeetingTranscribeAudioInput>;
