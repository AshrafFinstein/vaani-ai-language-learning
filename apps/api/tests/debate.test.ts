import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/** In-memory Prisma mock covering the debate service query surface. */
vi.mock('../src/prisma.js', () => {
  interface Debate {
    id: string;
    userId: string;
    languageCode: string;
    topicKey: string;
    motion: string;
    userSide: 'FOR' | 'AGAINST';
    level: string;
    status: 'ACTIVE' | 'CLOSED';
    createdAt: Date;
    updatedAt: Date;
  }
  interface Msg {
    id: string;
    debateId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    seq: number;
    createdAt: Date;
  }

  const debates = new Map<string, Debate>();
  const msgs: Msg[] = [];
  const languages = [
    { code: 'es', name: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', rtl: false, isActive: true },
  ];
  let counter = 0;
  const nextId = (p: string) => `${p}_${++counter}`;
  const debateMessages = (id: string) =>
    msgs.filter((m) => m.debateId === id).sort((a, b) => a.seq - b.seq);

  const prisma = {
    __reset() {
      debates.clear();
      msgs.length = 0;
      counter = 0;
    },
    profile: { findUnique: async () => null },
    language: {
      findFirst: async ({ where }: { where: { code: string } }) =>
        languages.find((l) => l.code === where.code) ?? null,
    },
    practiceSession: { create: async () => ({}) },
    debate: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const now = new Date();
        const debate: Debate = {
          id: nextId('debate'),
          createdAt: now,
          updatedAt: now,
          status: 'ACTIVE',
          userId: data.userId as string,
          languageCode: data.languageCode as string,
          topicKey: data.topicKey as string,
          motion: data.motion as string,
          userSide: data.userSide as 'FOR' | 'AGAINST',
          level: data.level as string,
        };
        debates.set(debate.id, debate);
        return { ...debate };
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const d = debates.get(where.id);
        if (!d || d.userId !== where.userId) return null;
        return { ...d, messages: debateMessages(d.id) };
      },
      findMany: async ({ where }: { where: { userId: string } }) =>
        [...debates.values()]
          .filter((d) => d.userId === where.userId)
          .map((d) => ({ ...d, _count: { messages: debateMessages(d.id).length } })),
      update: async ({ where, data }: { where: { id: string }; data: Partial<Debate> }) => {
        const d = debates.get(where.id)!;
        Object.assign(d, data);
        return { ...d };
      },
    },
    debateMessage: {
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

async function startDebate() {
  return auth
    .post('/api/debates')
    .send({ topicKey: 'remote_work', side: 'FOR', level: 'INTERMEDIATE', languageCode: 'es' });
}

beforeEach(() => prisma.__reset());

describe('POST /api/debates (start)', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/debates').send({});
    expect(res.status).toBe(401);
  });

  it('creates a debate with the learner side and motion', async () => {
    const res = await startDebate();
    expect(res.status).toBe(201);
    expect(res.body.data.debate).toMatchObject({
      topicKey: 'remote_work',
      userSide: 'FOR',
      status: 'ACTIVE',
    });
    expect(res.body.data.debate.motion.length).toBeGreaterThan(0);
  });

  it('rejects an unknown topic with 400', async () => {
    const res = await auth
      .post('/api/debates')
      .send({ topicKey: 'nope', side: 'FOR', level: 'INTERMEDIATE', languageCode: 'es' });
    expect(res.status).toBe(400);
  });

  it('validates the side (422)', async () => {
    const res = await auth
      .post('/api/debates')
      .send({ topicKey: 'remote_work', side: 'MAYBE', level: 'INTERMEDIATE' });
    expect(res.status).toBe(422);
  });
});

describe('debate turns + feedback', () => {
  it('takes a turn and gets an AI rebuttal', async () => {
    const { body } = await startDebate();
    const id = body.data.debate.id;

    const res = await auth
      .post(`/api/debates/${id}/turns`)
      .send({ content: 'Remote work saves commuting time and boosts focus.' });
    expect(res.status).toBe(201);
    expect(res.body.data.userMessage.role).toBe('USER');
    expect(res.body.data.assistantMessage.role).toBe('ASSISTANT');
    expect(res.body.data.assistantMessage.content.length).toBeGreaterThan(0);
  });

  it('returns structured, bounded feedback and closes the debate', async () => {
    const { body } = await startDebate();
    const id = body.data.debate.id;
    await auth.post(`/api/debates/${id}/turns`).send({ content: 'My first argument for the motion.' });

    const res = await auth.post(`/api/debates/${id}/feedback`);
    expect(res.status).toBe(200);
    expect(res.body.data.feedback.summary).toBeTruthy();
    expect(res.body.data.feedback.overall_score).toBeGreaterThanOrEqual(0);
    expect(res.body.data.feedback.overall_score).toBeLessThanOrEqual(100);

    const detail = await auth.get(`/api/debates/${id}`);
    expect(detail.body.data.debate.status).toBe('CLOSED');
  });

  it("404s for another user's debate", async () => {
    const { body } = await startDebate();
    const otherToken = signAccessToken({ sub: 'user_2', role: 'USER' });
    const res = await request(app)
      .get(`/api/debates/${body.data.debate.id}`)
      .set('Cookie', [`vaani_access=${otherToken}`]);
    expect(res.status).toBe(404);
  });
});
