import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/** In-memory Prisma mock covering the chat service's query surface. */
vi.mock('../src/prisma.js', () => {
  interface Conv {
    id: string;
    userId: string;
    languageCode: string;
    topic: string;
    level: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  }
  interface Msg {
    id: string;
    conversationId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    seq: number;
    createdAt: Date;
  }

  const convs = new Map<string, Conv>();
  const msgs: Msg[] = [];
  const languages = [
    { code: 'es', name: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', rtl: false, isActive: true },
  ];
  let counter = 0;
  const nextId = (p: string) => `${p}_${++counter}`;
  const convMessages = (id: string) => msgs.filter((m) => m.conversationId === id).sort((a, b) => a.seq - b.seq);

  const prisma = {
    __reset() {
      convs.clear();
      msgs.length = 0;
      counter = 0;
    },
    profile: {
      findUnique: async () => null,
    },
    language: {
      findFirst: async ({ where }: { where: { code: string } }) =>
        languages.find((l) => l.code === where.code && l.isActive) ?? null,
    },
    conversation: {
      create: async ({ data }: { data: Omit<Conv, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const now = new Date();
        const conv: Conv = { id: nextId('conv'), createdAt: now, updatedAt: now, ...data };
        convs.set(conv.id, conv);
        return { ...conv };
      },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => {
        const conv = convs.get(where.id);
        if (!conv || conv.userId !== where.userId) return null;
        const language = languages.find((l) => l.code === conv.languageCode)!;
        return { ...conv, messages: convMessages(conv.id), language };
      },
      findMany: async ({ where }: { where: { userId: string } }) =>
        [...convs.values()]
          .filter((c) => c.userId === where.userId)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .map((c) => {
            const list = convMessages(c.id);
            return { ...c, messages: list.slice(-1), _count: { messages: list.length } };
          }),
      update: async ({ where, data }: { where: { id: string }; data: { updatedAt: Date } }) => {
        const conv = convs.get(where.id)!;
        conv.updatedAt = data.updatedAt;
        return { ...conv };
      },
    },
    conversationMessage: {
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
const { prisma } = (await import('../src/prisma.js')) as unknown as { prisma: { __reset: () => void } };

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];
const auth = {
  get: (url: string) => request(app).get(url).set('Cookie', COOKIE),
  post: (url: string) => request(app).post(url).set('Cookie', COOKIE),
};

async function startConversation() {
  const res = await auth
    .post('/api/chat')
    .send({ topic: 'DAILY', level: 'BEGINNER', languageCode: 'es' });
  return res;
}

beforeEach(() => prisma.__reset());

describe('chat auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const res = await request(app).get('/api/chat/history');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/chat (start)', () => {
  it('creates a conversation and returns it', async () => {
    const res = await startConversation();
    expect(res.status).toBe(201);
    expect(res.body.data.conversation).toMatchObject({ topic: 'DAILY', level: 'BEGINNER', languageCode: 'es' });
    expect(res.body.data.conversation.title).toContain('Spanish');
  });

  it('validates the topic (422)', async () => {
    const res = await auth.post('/api/chat').send({ topic: 'NOPE', level: 'BEGINNER' });
    expect(res.status).toBe(422);
  });

  it('starts a roleplay conversation from a scenario', async () => {
    const res = await auth
      .post('/api/chat')
      .send({ mode: 'ROLEPLAY', scenarioKey: 'restaurant', level: 'BEGINNER', languageCode: 'es' });
    expect(res.status).toBe(201);
    expect(res.body.data.conversation.mode).toBe('ROLEPLAY');
    expect(res.body.data.conversation.scenarioKey).toBe('restaurant');
  });

  it('requires a scenario for roleplay mode (422)', async () => {
    const res = await auth
      .post('/api/chat')
      .send({ mode: 'ROLEPLAY', level: 'BEGINNER', languageCode: 'es' });
    expect(res.status).toBe(422);
  });
});

describe('messages + history + feedback', () => {
  it('sends a message and gets an AI reply', async () => {
    const { body } = await startConversation();
    const id = body.data.conversation.id;

    const res = await auth.post(`/api/chat/${id}/messages`).send({ content: 'hello vaani' });
    expect(res.status).toBe(201);
    expect(res.body.data.userMessage.content).toBe('hello vaani');
    expect(res.body.data.assistantMessage.role).toBe('ASSISTANT');
    expect(res.body.data.assistantMessage.content.length).toBeGreaterThan(0);
  });

  it('lists conversation history with a preview', async () => {
    const { body } = await startConversation();
    await auth.post(`/api/chat/${body.data.conversation.id}/messages`).send({ content: 'hi' });

    const res = await auth.get('/api/chat/history');
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toHaveLength(1);
    expect(res.body.data.conversations[0].messageCount).toBeGreaterThan(0);
  });

  it('returns structured feedback', async () => {
    const { body } = await startConversation();
    await auth.post(`/api/chat/${body.data.conversation.id}/messages`).send({ content: 'i go yesterday' });

    const res = await auth.post(`/api/chat/${body.data.conversation.id}/feedback`);
    expect(res.status).toBe(200);
    expect(res.body.data.feedback.overall_score).toBeGreaterThanOrEqual(0);
  });

  it('streams a reply as Server-Sent Events', async () => {
    const { body } = await startConversation();
    const res = await auth.post(`/api/chat/${body.data.conversation.id}/stream`).send({ content: 'hello' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('"type":"meta"');
    expect(res.text).toContain('"type":"done"');
  });

  it("404s for another user's conversation", async () => {
    const { body } = await startConversation();
    const otherToken = signAccessToken({ sub: 'user_2', role: 'USER' });
    const res = await request(app)
      .get(`/api/chat/${body.data.conversation.id}`)
      .set('Cookie', [`vaani_access=${otherToken}`]);
    expect(res.status).toBe(404);
  });
});
