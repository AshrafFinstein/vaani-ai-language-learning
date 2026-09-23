import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * In-memory Prisma mock covering the flashcard service query surface. A single seeded
 * system deck with two cards is enough to exercise list decks, deck detail, the review
 * queue, submitting a review (state advances), and generating a deck via the mock AI.
 */
vi.mock('../src/prisma.js', () => {
  const DECK = {
    id: 'deck_1',
    title: 'Spanish Travel Essentials',
    description: 'Words for travelling.',
    languageCode: 'es',
    userId: null as string | null,
    isSystem: true,
    sortOrder: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
  const CARDS = [
    { id: 'card_1', deckId: 'deck_1', term: 'el aeropuerto', translation: 'the airport', example: null, ordinal: 0 },
    { id: 'card_2', deckId: 'deck_1', term: 'el billete', translation: 'the ticket', example: 'Un billete.', ordinal: 1 },
  ];

  interface ReviewRow {
    id: string;
    userId: string;
    flashcardId: string;
    ease: number;
    intervalDays: number;
    repetitions: number;
    dueAt: Date;
    lastResult: string | null;
    lastReviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  const reviews = new Map<string, ReviewRow>(); // key `${userId}:${flashcardId}`
  const userDecks = new Map<string, typeof DECK & { cards: typeof CARDS }>();
  let counter = 0;
  const nextId = (p: string) => `${p}_${++counter}`;

  type Rec = Record<string, unknown>;

  /** Decks visible to a user: the system deck + any decks that user created in this test run. */
  const visibleDecks = (userId: string) => [
    { ...DECK, cards: CARDS.map((c) => ({ ...c })) },
    ...[...userDecks.values()].filter((d) => d.userId === userId).map((d) => ({ ...d, cards: d.cards.map((c) => ({ ...c })) })),
  ];
  const cardById = (id: string) => {
    const all = [...CARDS, ...[...userDecks.values()].flatMap((d) => d.cards)];
    return all.find((c) => c.id === id) ?? null;
  };

  const prisma = {
    __reset() {
      reviews.clear();
      userDecks.clear();
      counter = 0;
    },
    profile: { findUnique: async () => ({ learningLanguageCode: 'es', level: 'BEGINNER' }) },
    language: {
      findFirst: async ({ where }: { where: { code: string } }) =>
        where.code === 'es' ? { code: 'es', name: 'Spanish' } : null,
    },
    practiceSession: { create: async () => ({}) },
    flashcardDeck: {
      findMany: async ({ where }: { where: Rec }) => {
        // listDecks passes { OR: [{ isSystem: true }, { userId }] }
        const or = where.OR as Array<Rec> | undefined;
        const userId = or?.find((o) => typeof o.userId === 'string')?.userId as string | undefined;
        if (userId) return visibleDecks(userId);
        // explore-style { isSystem: true }
        return [{ ...DECK, cards: CARDS.map((c) => ({ ...c })) }];
      },
      findFirst: async ({ where }: { where: Rec }) => {
        const id = where.id as string | undefined;
        const or = where.OR as Array<Rec> | undefined;
        const userId = or?.find((o) => typeof o.userId === 'string')?.userId as string | undefined;
        const decks = userId ? visibleDecks(userId) : [{ ...DECK, cards: CARDS.map((c) => ({ ...c })) }];
        const found = decks.find((d) => !id || d.id === id);
        return found ?? null;
      },
      create: async ({ data }: { data: Rec }) => {
        const id = nextId('deck');
        const cardsData = ((data.cards as Rec)?.create as Array<Rec>) ?? [];
        const deck = {
          id,
          title: data.title as string,
          description: (data.description as string) ?? '',
          languageCode: data.languageCode as string,
          userId: (data.userId as string) ?? null,
          isSystem: Boolean(data.isSystem),
          sortOrder: 0,
          createdAt: new Date('2026-02-01T00:00:00Z'),
          cards: cardsData.map((c, i) => ({
            id: nextId('card'),
            deckId: id,
            term: c.term as string,
            translation: c.translation as string,
            example: (c.example as string) ?? null,
            ordinal: (c.ordinal as number) ?? i,
          })),
        };
        userDecks.set(id, deck);
        return deck;
      },
    },
    flashcard: {
      findMany: async ({ where }: { where: Rec }) => {
        const deck = where.deck as Rec | undefined;
        const deckId = deck?.id as string | undefined;
        const or = deck?.OR as Array<Rec> | undefined;
        const userId = or?.find((o) => typeof o.userId === 'string')?.userId as string | undefined;
        const decks = userId ? visibleDecks(userId) : [{ ...DECK, cards: CARDS.map((c) => ({ ...c })) }];
        const cards = decks.filter((d) => !deckId || d.id === deckId).flatMap((d) => d.cards);
        return cards.map((c) => ({ ...c }));
      },
      findFirst: async ({ where }: { where: Rec }) => {
        const id = where.id as string;
        return cardById(id);
      },
    },
    flashcardReview: {
      findMany: async ({ where }: { where: { userId: string; flashcardId: { in: string[] } } }) =>
        where.flashcardId.in
          .map((id) => reviews.get(`${where.userId}:${id}`))
          .filter((r): r is ReviewRow => Boolean(r))
          .map((r) => ({ ...r })),
      findUnique: async ({
        where,
      }: {
        where: { userId_flashcardId: { userId: string; flashcardId: string } };
      }) => {
        const { userId, flashcardId } = where.userId_flashcardId;
        return reviews.get(`${userId}:${flashcardId}`) ?? null;
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { userId_flashcardId: { userId: string; flashcardId: string } };
        create: Rec;
        update: Rec;
      }) => {
        const { userId, flashcardId } = where.userId_flashcardId;
        const key = `${userId}:${flashcardId}`;
        const existing = reviews.get(key);
        const now = new Date();
        const row: ReviewRow = existing
          ? { ...existing, ...(update as Partial<ReviewRow>), updatedAt: now }
          : {
              id: nextId('rev'),
              userId,
              flashcardId,
              ease: create.ease as number,
              intervalDays: create.intervalDays as number,
              repetitions: create.repetitions as number,
              dueAt: create.dueAt as Date,
              lastResult: (create.lastResult as string) ?? null,
              lastReviewedAt: (create.lastReviewedAt as Date) ?? null,
              createdAt: now,
              updatedAt: now,
            };
        reviews.set(key, row);
        return { ...row };
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

beforeEach(() => prisma.__reset());

describe('GET /api/flashcards/decks', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/flashcards/decks');
    expect(res.status).toBe(401);
  });

  it('lists visible decks with card + due counts', async () => {
    const res = await auth.get('/api/flashcards/decks');
    expect(res.status).toBe(200);
    expect(res.body.data.decks).toHaveLength(1);
    expect(res.body.data.decks[0]).toMatchObject({
      id: 'deck_1',
      isSystem: true,
      isOwner: false,
      cardCount: 2,
      dueCount: 2, // no reviews yet → all cards due
    });
  });
});

describe('GET /api/flashcards/decks/:deckId', () => {
  it('returns deck detail with ordered cards', async () => {
    const res = await auth.get('/api/flashcards/decks/deck_1');
    expect(res.status).toBe(200);
    expect(res.body.data.deck.cards).toHaveLength(2);
    expect(res.body.data.deck.cards[0].term).toBe('el aeropuerto');
  });
});

describe('GET /api/flashcards/review', () => {
  it('returns all cards as due before any review', async () => {
    const res = await auth.get('/api/flashcards/review?deckId=deck_1');
    expect(res.status).toBe(200);
    expect(res.body.data.queue.dueCount).toBe(2);
    expect(res.body.data.queue.totalCount).toBe(2);
  });
});

describe('POST /api/flashcards/review', () => {
  it('validates the body (422)', async () => {
    const res = await auth.post('/api/flashcards/review').send({ flashcardId: 'card_1' });
    expect(res.status).toBe(422);
  });

  it('advances the spaced-repetition state and schedules the next review', async () => {
    const res = await auth.post('/api/flashcards/review').send({ flashcardId: 'card_1', result: 'GOOD' });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toMatchObject({
      flashcardId: 'card_1',
      lastResult: 'GOOD',
      repetitions: 1,
      intervalDays: 1,
    });

    // After a GOOD review the card is no longer due, so the queue shrinks.
    const queue = await auth.get('/api/flashcards/review?deckId=deck_1');
    expect(queue.body.data.queue.dueCount).toBe(1);
  });

  it('resets progress on AGAIN', async () => {
    await auth.post('/api/flashcards/review').send({ flashcardId: 'card_2', result: 'EASY' });
    const again = await auth.post('/api/flashcards/review').send({ flashcardId: 'card_2', result: 'AGAIN' });
    expect(again.status).toBe(200);
    expect(again.body.data.state.repetitions).toBe(0);
    expect(again.body.data.state.intervalDays).toBe(0);
  });
});

describe('POST /api/flashcards/decks/generate', () => {
  it('generates a deck via the mock AI abstraction and persists it', async () => {
    const res = await auth.post('/api/flashcards/decks/generate').send({ topic: 'at the market', count: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.deck.isOwner).toBe(true);
    expect(res.body.data.deck.cardCount).toBe(5);
    expect(res.body.data.deck.cards[0].term).toContain('at the market');
  });

  it('validates the topic (422)', async () => {
    const res = await auth.post('/api/flashcards/decks/generate').send({});
    expect(res.status).toBe(422);
  });
});
