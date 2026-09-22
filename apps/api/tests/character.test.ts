import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/** In-memory Prisma mock covering the character + chat service query surface. */
vi.mock('../src/prisma.js', () => {
  interface Conv {
    id: string;
    userId: string;
    languageCode: string;
    mode: string;
    topic: string;
    scenarioKey: string | null;
    characterId: string | null;
    level: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  }

  const characters = [
    {
      id: 'char_1',
      key: 'barista',
      name: 'Mika the Barista',
      tagline: 'a cheerful barista',
      description: 'Practice ordering drinks.',
      setting: 'a café',
      avatarEmoji: '☕',
      greeting: 'Welcome! What can I get you?',
      persona: 'You are Mika, a friendly barista.',
      sortOrder: 1,
      isActive: true,
    },
  ];
  const languages = [
    { code: 'es', name: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', rtl: false, isActive: true },
  ];
  const convs = new Map<string, Conv>();
  let counter = 0;
  const nextId = (p: string) => `${p}_${++counter}`;

  const prisma = {
    __reset() {
      convs.clear();
      counter = 0;
    },
    profile: { findUnique: async () => null },
    language: {
      findFirst: async ({ where }: { where: { code: string } }) =>
        languages.find((l) => l.code === where.code && l.isActive) ?? null,
    },
    aICharacter: {
      findMany: async () => characters.filter((c) => c.isActive),
      findFirst: async ({ where }: { where: { key: string } }) =>
        characters.find((c) => c.key === where.key && c.isActive) ?? null,
    },
    conversation: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const now = new Date();
        const conv: Conv = {
          id: nextId('conv'),
          createdAt: now,
          updatedAt: now,
          userId: data.userId as string,
          languageCode: data.languageCode as string,
          mode: data.mode as string,
          topic: (data.topic as string) ?? 'FREE',
          scenarioKey: (data.scenarioKey as string) ?? null,
          characterId: (data.characterId as string) ?? null,
          level: data.level as string,
          title: data.title as string,
        };
        convs.set(conv.id, conv);
        return { ...conv };
      },
    },
    practiceSession: { create: async () => ({}) },
  };

  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');
const { prisma } = (await import('../src/prisma.js')) as unknown as {
  prisma: { __reset: () => void };
};

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];

beforeEach(() => prisma.__reset());

describe('GET /api/characters', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/characters');
    expect(res.status).toBe(401);
  });

  it('lists the seeded characters', async () => {
    const res = await request(app).get('/api/characters').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data.characters).toHaveLength(1);
    expect(res.body.data.characters[0]).toMatchObject({ key: 'barista', name: 'Mika the Barista' });
  });
});

describe('POST /api/characters (start)', () => {
  it('starts a CHARACTER conversation seeded with the greeting', async () => {
    const res = await request(app)
      .post('/api/characters')
      .set('Cookie', COOKIE)
      .send({ characterKey: 'barista', level: 'BEGINNER', languageCode: 'es' });

    expect(res.status).toBe(201);
    expect(res.body.data.conversation).toMatchObject({ mode: 'CHARACTER', languageCode: 'es' });
    expect(res.body.data.conversation.title).toContain('Mika the Barista');
  });

  it('rejects an unknown character with 400', async () => {
    const res = await request(app)
      .post('/api/characters')
      .set('Cookie', COOKIE)
      .send({ characterKey: 'nobody', level: 'BEGINNER', languageCode: 'es' });
    expect(res.status).toBe(400);
  });

  it('validates the body (422)', async () => {
    const res = await request(app)
      .post('/api/characters')
      .set('Cookie', COOKIE)
      .send({ level: 'BEGINNER' });
    expect(res.status).toBe(422);
  });
});
