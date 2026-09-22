import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/** In-memory Prisma mock covering the photo service query surface. */
vi.mock('../src/prisma.js', () => {
  interface Session {
    id: string;
    userId: string;
    languageCode: string;
    imageUrl: string;
    description: string;
    level: string;
    createdAt: Date;
    updatedAt: Date;
  }
  interface Msg {
    id: string;
    photoSessionId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    seq: number;
    createdAt: Date;
  }

  const sessions = new Map<string, Session>();
  const msgs: Msg[] = [];
  const languages = [
    { code: 'es', name: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', rtl: false, isActive: true },
  ];
  let counter = 0;
  const nextId = (p: string) => `${p}_${++counter}`;
  const sessionMessages = (id: string) =>
    msgs.filter((m) => m.photoSessionId === id).sort((a, b) => a.seq - b.seq);

  const prisma = {
    __reset() {
      sessions.clear();
      msgs.length = 0;
      counter = 0;
    },
    profile: { findUnique: async () => null },
    language: {
      findFirst: async ({ where }: { where: { code: string } }) =>
        languages.find((l) => l.code === where.code) ?? null,
    },
    practiceSession: { create: async () => ({}) },
    photoSession: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const now = new Date();
        const session: Session = {
          id: nextId('photo'),
          createdAt: now,
          updatedAt: now,
          userId: data.userId as string,
          languageCode: data.languageCode as string,
          imageUrl: data.imageUrl as string,
          description: data.description as string,
          level: data.level as string,
        };
        sessions.set(session.id, session);
        // Persist the seeded opener message when present.
        const create = (data.messages as { create?: { role: 'USER' | 'ASSISTANT'; content: string } })
          ?.create;
        if (create) {
          msgs.push({
            id: nextId('msg'),
            photoSessionId: session.id,
            role: create.role,
            content: create.content,
            seq: counter,
            createdAt: new Date(),
          });
        }
        return { ...session };
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const s = sessions.get(where.id);
        if (!s || s.userId !== where.userId) return null;
        return { ...s, messages: sessionMessages(s.id) };
      },
      findMany: async ({ where }: { where: { userId: string } }) =>
        [...sessions.values()].filter((s) => s.userId === where.userId),
      update: async ({ where, data }: { where: { id: string }; data: Partial<Session> }) => {
        const s = sessions.get(where.id)!;
        Object.assign(s, data);
        return { ...s };
      },
    },
    photoMessage: {
      create: async ({ data }: { data: Omit<Msg, 'id' | 'seq' | 'createdAt'> }) => {
        const msg: Msg = { id: nextId('msg'), seq: counter, createdAt: new Date(), ...data };
        msgs.push(msg);
        return { ...msg };
      },
    },
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
const auth = {
  get: (url: string) => request(app).get(url).set('Cookie', COOKIE),
  post: (url: string) => request(app).post(url).set('Cookie', COOKIE),
};

const IMAGE = 'data:image/png;base64,AAAABBBBCCCCDDDD';

async function startSession() {
  return auth.post('/api/photos').send({ image: IMAGE, level: 'BEGINNER', languageCode: 'es' });
}

beforeEach(() => prisma.__reset());

describe('POST /api/photos (start with mock vision)', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/photos').send({});
    expect(res.status).toBe(401);
  });

  it('describes the image (mock vision) and seeds an opener', async () => {
    const res = await startSession();
    expect(res.status).toBe(201);
    // The mock vision produced a deterministic description stored on the session.
    expect(res.body.data.session.description.length).toBeGreaterThan(0);
    expect(res.body.data.session.imageUrl).toBe(IMAGE);

    const detail = await auth.get(`/api/photos/${res.body.data.session.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.session.messages[0].role).toBe('ASSISTANT');
  });

  it('rejects an image that is neither a data-URL nor an http URL (422)', async () => {
    const res = await auth.post('/api/photos').send({ image: 'not-an-image', level: 'BEGINNER' });
    expect(res.status).toBe(422);
  });
});

describe('photo conversation', () => {
  it('sends a message and gets an AI reply about the photo', async () => {
    const { body } = await startSession();
    const id = body.data.session.id;

    const res = await auth.post(`/api/photos/${id}/messages`).send({ content: 'What is in the photo?' });
    expect(res.status).toBe(201);
    expect(res.body.data.userMessage.content).toBe('What is in the photo?');
    expect(res.body.data.assistantMessage.role).toBe('ASSISTANT');
    expect(res.body.data.assistantMessage.content.length).toBeGreaterThan(0);
  });

  it("404s for another user's session", async () => {
    const { body } = await startSession();
    const otherToken = signAccessToken({ sub: 'user_2', role: 'USER' });
    const res = await request(app)
      .get(`/api/photos/${body.data.session.id}`)
      .set('Cookie', [`vaani_access=${otherToken}`]);
    expect(res.status).toBe(404);
  });
});
