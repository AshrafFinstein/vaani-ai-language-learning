import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OpenAIProvider,
  OpenAISttProvider,
  OpenAITtsProvider,
  ProviderHttpError,
  createSttProvider,
  createTtsProvider,
} from '@vaani/ai';

// A tiny helper to build a JSON Response like the OpenAI chat API returns.
function chatResponse(content: string, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('OpenAIProvider.call hardening', () => {
  it('retries on 429 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(chatResponse('Hello!'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      hardening: { backoffBaseMs: 1, maxAttempts: 3 },
    });
    const { reply } = await provider.chat([{ role: 'user', content: 'hi' }]);
    expect(reply).toBe('Hello!');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 then throws a typed ProviderHttpError when exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      hardening: { backoffBaseMs: 1, maxAttempts: 2 },
    });
    await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      ProviderHttpError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a non-retryable 401 (bad key)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAIProvider({
      apiKey: 'bad-key',
      hardening: { backoffBaseMs: 1, maxAttempts: 3 },
    });
    await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'http',
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts on timeout and surfaces a typed timeout error', async () => {
    // Simulate a hang that the AbortController cancels: reject with an AbortError.
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      hardening: { timeoutMs: 5, maxAttempts: 1, backoffBaseMs: 1 },
    });
    await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('falls back to the mock provider on a transient failure when enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 503 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      fallbackToMock: true,
      hardening: { backoffBaseMs: 1, maxAttempts: 1 },
    });
    const { reply } = await provider.chat([{ role: 'user', content: 'hi' }]);
    expect(reply.length).toBeGreaterThan(0); // mock produced a reply instead of throwing
  });

  it('does NOT mask a non-retryable 401 even with fallback enabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAIProvider({
      apiKey: 'bad-key',
      fallbackToMock: true,
      hardening: { backoffBaseMs: 1, maxAttempts: 1 },
    });
    await expect(provider.analyze([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      status: 401,
    });
  });

  it('threads a configurable model into the request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatResponse('ok'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new OpenAIProvider({ apiKey: 'k', model: 'gpt-4o' });
    await provider.chat([{ role: 'user', content: 'hi' }]);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.model).toBe('gpt-4o');
  });
});

describe('OpenAISttProvider.transcribe', () => {
  it('builds a multipart request and parses the transcript', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: '  hello world  ' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const stt = new OpenAISttProvider({ apiKey: 'k', model: 'whisper-1' });
    const result = await stt.transcribe(new TextEncoder().encode('fake-audio').buffer, 'en');
    expect(result.text).toBe('hello world');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/audio/transcriptions');
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    const form = (init as RequestInit).body as FormData;
    expect(form.get('model')).toBe('whisper-1');
    expect(form.get('language')).toBe('en');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer k' });
  });
});

describe('OpenAITtsProvider.synthesize', () => {
  it('posts JSON and returns audio bytes + mimeType', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(bytes, { status: 200, headers: { 'content-type': 'audio/mpeg' } }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const tts = new OpenAITtsProvider({ apiKey: 'k', model: 'tts-1', voice: 'alloy' });
    const result = await tts.synthesize('hello', 'en');
    expect(result.mimeType).toBe('audio/mpeg');
    expect(new Uint8Array(result.audio)).toEqual(bytes);

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toMatchObject({ model: 'tts-1', voice: 'alloy', input: 'hello' });
  });
});

describe('speech factories select provider from env', () => {
  it('returns the Mock STT/TTS by default (no key)', () => {
    expect(createSttProvider({}).name).toBe('mock');
    expect(createTtsProvider({}).name).toBe('mock');
  });

  it('returns Mock even when openai is selected but no key is present', () => {
    expect(createSttProvider({ provider: 'openai' }).name).toBe('mock');
    expect(createTtsProvider({ speechProvider: 'openai' }).name).toBe('mock');
  });

  it('returns the OpenAI STT/TTS when openai is selected and a key is present', () => {
    expect(createSttProvider({ provider: 'openai', openaiApiKey: 'k' }).name).toBe('openai');
    expect(createTtsProvider({ speechProvider: 'openai', openaiApiKey: 'k' }).name).toBe('openai');
  });
});
