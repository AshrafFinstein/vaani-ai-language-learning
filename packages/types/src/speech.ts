import { z } from 'zod';

/**
 * Speech contracts (real STT/TTS on PROVIDED audio). Keys live only on the backend;
 * the provider abstraction (`@vaani/ai`) decides mock vs. real. Audio crosses the API
 * as base64 (optionally a data-URL) inside JSON, matching the existing photo/data-URL
 * convention — no multipart plumbing is introduced.
 */

/**
 * Accepts raw base64 or a data-URL (`data:audio/webm;base64,...` or `data:video/mp4;base64,...`).
 * Meeting recordings are often `video/*` containers (e.g. an `.mp4` screen recording), so both
 * `audio/*` and `video/*` data-URLs are permitted; the concrete MIME is validated where used.
 */
const base64Audio = z
  .string()
  .min(1, 'Audio is required')
  .max(20_000_000, 'Audio is too large')
  .refine(
    (v) =>
      /^data:(?:audio|video)\/[\w.+-]+;base64,/.test(v) || /^[A-Za-z0-9+/=\s]+$/.test(v),
    'Audio must be base64 or a base64 audio/video data-URL',
  );

/**
 * Supported STT container MIME types. Whisper detects the container from the upload filename,
 * so we carry the real format through; anything outside this allow-list is rejected (422) rather
 * than silently mis-transcribed. `video/mp4` is included because meeting recordings are common.
 */
export const SUPPORTED_TRANSCRIBE_MIME_TYPES = [
  'audio/webm',
  'video/webm',
  'video/mp4',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
] as const;

/** An explicit MIME hint for the recording's real format (validated against the allow-list). */
const transcribeMimeType = z
  .string()
  .trim()
  .refine(
    (v) => (SUPPORTED_TRANSCRIBE_MIME_TYPES as readonly string[]).includes(v.toLowerCase()),
    'Unsupported audio format',
  );

export const TranscribeInput = z.object({
  /** Base64 (or data-URL) encoded audio to transcribe. */
  audio: base64Audio,
  /** Optional BCP-47/ISO language hint, e.g. "en", "es". */
  languageCode: z.string().min(2).max(10).optional(),
  /**
   * Optional explicit MIME type of the recording (e.g. `video/mp4`). When omitted, the server
   * derives it from an `audio`/`video` data-URL prefix if present. Drives the Whisper upload
   * filename so the container is detected correctly.
   */
  mimeType: transcribeMimeType.optional(),
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
  /**
   * Optional explicit MIME type of the recording (e.g. `video/mp4`). When omitted, the server
   * derives it from an `audio`/`video` data-URL prefix if present. Carried through to the STT
   * provider so Whisper detects the real container from the upload filename extension.
   */
  mimeType: transcribeMimeType.optional(),
});
export type MeetingTranscribeAudioInput = z.infer<typeof MeetingTranscribeAudioInput>;
