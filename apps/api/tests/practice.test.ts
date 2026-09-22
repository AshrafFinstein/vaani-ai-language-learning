import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Minimal Prisma mock for the practice (sentence) service.
vi.mock('../src/prisma.js', () => {
  const prisma = {
    profile: {
      findUnique: async () => ({ learningLanguageCode: 'es', level: 'INTERMEDIATE' }),
    },
    language: {
      findFirst: async () => ({ code: 'es', name: 'Spanish', isActive: true }),
    },
    practiceSession: {
      create: async () => ({ id: 'ps_1' }),
    },
  };
  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];

describe('POST /api/practice/sentence', () => {
  it('returns a structured sentence evaluation', async () => {
    const res = await request(app)
      .post('/api/practice/sentence')
      .set('Cookie', COOKIE)
      .send({ prompt: 'Tell me about your weekend.', answer: 'i went to the park' });

    expect(res.status).toBe(200);
    expect(res.body.data.evaluation).toMatchObject({ isCorrect: false });
    expect(res.body.data.evaluation.corrected).toBe('I went to the park.');
    expect(typeof res.body.data.evaluation.overall_score).toBe('number');
  });

  it('rejects an empty answer with 422', async () => {
    const res = await request(app)
      .post('/api/practice/sentence')
      .set('Cookie', COOKIE)
      .send({ prompt: 'Tell me about your weekend.', answer: '' });
    expect(res.status).toBe(422);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/practice/sentence')
      .send({ prompt: 'x', answer: 'hello there.' });
    expect(res.status).toBe(401);
  });
});
