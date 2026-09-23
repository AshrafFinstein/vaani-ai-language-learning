import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAISttProvider, whisperUploadFilename } from '../src/index.js';

/**
 * Offline unit tests for the real Whisper STT provider. NO network and NO API key reach
 * OpenAI: `fetch` is stubbed so we can assert the multipart upload filename — Whisper
 * detects the audio container from that filename's EXTENSION, so a `video/mp4` recording
 * MUST be uploaded as `audio.mp4` (not the historical hardcoded `audio.webm`).
 */

/** A `fetch` stub that captures the request body and returns a canned transcription. */
function stubFetch(): { calls: RequestInit[] } {
  const calls: RequestInit[] = [];
  const fake = vi.fn(async (_url: string, init: RequestInit) => {
    calls.push(init);
    return new Response(JSON.stringify({ text: 'hello world' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fake);
  return { calls };
}

/** Pulls the uploaded file's filename out of the captured FormData body. */
function uploadedFilename(init: RequestInit): string {
  const body = init.body;
  if (!(body instanceof FormData)) throw new Error('expected FormData body');
  const file = body.get('file');
  if (!(file instanceof File)) throw new Error('expected a File entry named "file"');
  return file.name;
}

const provider = new OpenAISttProvider({ apiKey: 'test-key' });
const audio = new TextEncoder().encode('fake-audio-bytes').buffer;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('OpenAISttProvider.transcribe — format hint drives the upload filename', () => {
  it('uses audio.mp4 for a video/mp4 hint', async () => {
    const { calls } = stubFetch();
    const res = await provider.transcribe(audio, 'en', { mimeType: 'video/mp4' });
    expect(res.text).toBe('hello world');
    expect(calls).toHaveLength(1);
    expect(uploadedFilename(calls[0]!)).toBe('audio.mp4');
  });

  it('derives the extension from an explicit filename hint', async () => {
    const { calls } = stubFetch();
    await provider.transcribe(audio, undefined, { filename: 'meeting-recording.MP4' });
    expect(uploadedFilename(calls[0]!)).toBe('audio.mp4');
  });

  it('defaults to audio.webm when no hint is given (backward compatible)', async () => {
    const { calls } = stubFetch();
    await provider.transcribe(audio);
    expect(uploadedFilename(calls[0]!)).toBe('audio.webm');
  });

  it('defaults to audio.webm for an unrecognised hint', async () => {
    const { calls } = stubFetch();
    await provider.transcribe(audio, 'en', { mimeType: 'application/octet-stream' });
    expect(uploadedFilename(calls[0]!)).toBe('audio.webm');
  });
});

describe('whisperUploadFilename — mime/extension → filename mapping', () => {
  it('maps common container types', () => {
    expect(whisperUploadFilename({ mimeType: 'video/mp4' })).toBe('audio.mp4');
    expect(whisperUploadFilename({ mimeType: 'audio/mpeg' })).toBe('audio.mp3');
    expect(whisperUploadFilename({ mimeType: 'audio/wav' })).toBe('audio.wav');
    expect(whisperUploadFilename({ mimeType: 'audio/webm' })).toBe('audio.webm');
    expect(whisperUploadFilename({ mimeType: 'audio/mp4' })).toBe('audio.m4a');
  });

  it('prefers a usable filename extension over the mime type', () => {
    expect(whisperUploadFilename({ filename: 'clip.wav', mimeType: 'video/mp4' })).toBe('audio.wav');
  });

  it('falls back to audio.webm for unknown or missing hints', () => {
    expect(whisperUploadFilename()).toBe('audio.webm');
    expect(whisperUploadFilename({ mimeType: 'text/plain' })).toBe('audio.webm');
    expect(whisperUploadFilename({ filename: 'noext' })).toBe('audio.webm');
  });
});
