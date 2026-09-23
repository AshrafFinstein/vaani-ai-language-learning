import { describe, expect, it } from 'vitest';
import request from 'supertest';

// Default env (AI_PROVIDER=mock) → the deterministic Mock STT/TTS providers, no network.
const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];

// A tiny base64 audio data-URL (contents irrelevant — the mock ignores them).
const AUDIO = `data:audio/webm;base64,${Buffer.from('fake-audio').toString('base64')}`;

describe('POST /api/speech/transcribe', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/speech/transcribe').send({ audio: AUDIO });
    expect(res.status).toBe(401);
  });

  it('rejects a missing audio payload with 422 validation', async () => {
    const res = await request(app)
      .post('/api/speech/transcribe')
      .set('Cookie', COOKIE)
      .send({});
    expect(res.status).toBe(422);
  });

  it('transcribes provided audio via the mock provider', async () => {
    const res = await request(app)
      .post('/api/speech/transcribe')
      .set('Cookie', COOKIE)
      .send({ audio: AUDIO, languageCode: 'en' });
    expect(res.status).toBe(200);
    expect(res.body.data.provider).toBe('mock');
    expect(typeof res.body.data.text).toBe('string');
    expect(res.body.data.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe('POST /api/speech/synthesize', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/speech/synthesize').send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('rejects empty text with 422 validation', async () => {
    const res = await request(app)
      .post('/api/speech/synthesize')
      .set('Cookie', COOKIE)
      .send({ text: '' });
    expect(res.status).toBe(422);
  });

  it('synthesizes speech via the mock provider (base64 audio + mimeType)', async () => {
    const res = await request(app)
      .post('/api/speech/synthesize')
      .set('Cookie', COOKIE)
      .send({ text: 'hello there', languageCode: 'en' });
    expect(res.status).toBe(200);
    expect(res.body.data.provider).toBe('mock');
    expect(typeof res.body.data.audio).toBe('string');
    expect(res.body.data.mimeType).toBe('audio/mpeg');
  });
});
