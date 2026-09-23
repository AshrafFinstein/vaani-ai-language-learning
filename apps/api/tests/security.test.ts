import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * Security / permission / privacy tests (Phase 11). These assert cross-user
 * authorization (ownership), authentication on protected routes, and input
 * validation across the highest-risk endpoints — a user must never be able to
 * read or mutate another user's resources.
 *
 * The in-memory Prisma mock reproduces the real services' ownership rule: a scoped
 * `findFirst` is filtered by `userId`, so another user's id yields `null`, which the
 * services turn into a 404 (no data leakage) rather than returning the row.
 */

const OWNER = 'user_1';

// A resource owned by OWNER, keyed by id. Each service reads its own model; the mock
// returns the row only when the querying `userId` matches (mirrors getOwned* helpers).
function ownedFindFirst(row: Record<string, unknown>) {
  return async ({ where }: { where: { id?: string; userId?: string } }) => {
    if (where.userId && where.userId !== OWNER) return null;
    return { ...row };
  };
}

vi.mock('../src/prisma.js', () => {
  const conversation = {
    id: 'conv_1',
    userId: OWNER,
    languageCode: 'es',
    mode: 'CHAT',
    topic: 'DAILY',
    scenarioKey: null,
    characterId: null,
    level: 'BEGINNER',
    title: 'Daily · Spanish',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    messages: [],
    language: { code: 'es', name: 'Spanish' },
    character: null,
  };

  const meeting = {
    id: 'm_1',
    userId: OWNER,
    title: 'Weekly sync',
    provider: 'TEAMS',
    scheduledStart: new Date('2026-10-01T10:00:00Z'),
    scheduledEnd: new Date('2026-10-01T11:00:00Z'),
    recordingEnabled: true,
    transcriptionEnabled: false,
    aiAnalysisEnabled: true,
    analysisStatus: 'PENDING',
    createdAt: new Date('2026-09-22T00:00:00Z'),
    updatedAt: new Date('2026-09-22T00:00:00Z'),
    participants: [],
    recording: {
      id: 'r_1',
      meetingId: 'm_1',
      state: 'IDLE',
      recordingConsent: false,
      transcriptConsent: false,
      startedAt: null,
      endedAt: null,
      durationSeconds: 0,
    },
    summary: null,
    decisions: [],
    actionItems: [],
    transcript: null,
  };

  const debate = {
    id: 'd_1',
    userId: OWNER,
    languageCode: 'es',
    topicKey: 'remote-work',
    motion: 'Remote work is better',
    userSide: 'FOR',
    level: 'BEGINNER',
    status: 'ACTIVE',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    messages: [],
  };

  const photo = {
    id: 'photo_1',
    userId: OWNER,
    languageCode: 'es',
    imageUrl: 'https://example.com/a.jpg',
    description: 'A cat',
    level: 'BEGINNER',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    messages: [],
  };

  // A *user-owned* flashcard deck (not a shared system deck). The real query is
  // { id, OR: [{ isSystem: true }, { userId }] }; our mock treats a non-owner as no match.
  const deck = {
    id: 'deck_1',
    userId: OWNER,
    isSystem: false,
    title: 'My words',
    description: '',
    languageCode: 'es',
    sortOrder: 0,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    cards: [],
  };

  const prisma = {
    conversation: { findFirst: ownedFindFirst(conversation) },
    meeting: { findFirst: ownedFindFirst(meeting) },
    debate: { findFirst: ownedFindFirst(debate) },
    photoSession: { findFirst: ownedFindFirst(photo) },
    flashcardDeck: {
      findFirst: async ({ where }: { where: { userId?: string; OR?: unknown } }) => {
        // Deck query uses OR:[{isSystem},{userId}] — approximate: only the owner matches
        // this user-owned deck. A wrong owner sees no system-or-owned match → null → 404.
        const or = where.OR as Array<{ userId?: string; isSystem?: boolean }> | undefined;
        const owns = or?.some((c) => c.userId === OWNER);
        return owns ? { ...deck } : null;
      },
    },
  };
  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');

const app = createApp();
const ownerToken = signAccessToken({ sub: OWNER, role: 'USER' });
const attackerToken = signAccessToken({ sub: 'user_2', role: 'USER' });
const OWNER_COOKIE = [`vaani_access=${ownerToken}`];
const ATTACKER_COOKIE = [`vaani_access=${attackerToken}`];

// Highest-risk GET-by-id endpoints across modules. Each is owned by OWNER only.
const ownedResources: Array<{ name: string; url: string }> = [
  { name: 'conversation', url: '/api/chat/conv_1' },
  { name: 'meeting', url: '/api/meetings/m_1' },
  { name: 'debate', url: '/api/debates/d_1' },
  { name: 'photo session', url: '/api/photos/photo_1' },
  { name: 'flashcard deck', url: '/api/flashcards/decks/deck_1' },
];

describe('AuthZ — cross-user resource isolation', () => {
  for (const { name, url } of ownedResources) {
    it(`lets the owner read their ${name} (200)`, async () => {
      const res = await request(app).get(url).set('Cookie', OWNER_COOKIE);
      expect(res.status).toBe(200);
    });

    it(`hides another user's ${name} (404, no data leakage)`, async () => {
      const res = await request(app).get(url).set('Cookie', ATTACKER_COOKIE);
      // Ownership-scoped lookups return 404, never the row.
      expect(res.status).toBe(404);
      expect(res.body).not.toHaveProperty('data');
    });
  }
});

describe('AuthZ — mutations are ownership-scoped', () => {
  it("blocks starting a recording on another user's meeting (404)", async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/recording/start')
      .set('Cookie', ATTACKER_COOKIE)
      .send({ recordingConsent: true, transcriptConsent: false });
    expect(res.status).toBe(404);
  });

  it("blocks deleting another user's recording (404)", async () => {
    const res = await request(app)
      .delete('/api/meetings/m_1/recording')
      .set('Cookie', ATTACKER_COOKIE);
    expect(res.status).toBe(404);
  });

  it("blocks deleting another user's transcript (404)", async () => {
    const res = await request(app)
      .delete('/api/meetings/m_1/transcript')
      .set('Cookie', ATTACKER_COOKIE);
    expect(res.status).toBe(404);
  });

  it("blocks posting a debate turn on another user's debate (404)", async () => {
    const res = await request(app)
      .post('/api/debates/d_1/turns')
      .set('Cookie', ATTACKER_COOKIE)
      .send({ content: 'my argument' });
    expect(res.status).toBe(404);
  });
});

describe('AuthN — protected routes reject missing/invalid tokens', () => {
  const protectedRoutes = [
    '/api/chat/history',
    '/api/meetings',
    '/api/debates',
    '/api/photos',
    '/api/flashcards/decks',
    '/api/courses',
    '/api/progress',
  ];

  for (const url of protectedRoutes) {
    it(`rejects ${url} without a token (401)`, async () => {
      const res = await request(app).get(url);
      expect(res.status).toBe(401);
    });
  }

  it('rejects an invalid/garbage token (401)', async () => {
    const res = await request(app)
      .get('/api/meetings')
      .set('Cookie', ['vaani_access=not-a-real-jwt']);
    expect(res.status).toBe(401);
  });
});

describe('Input validation — bad input returns 422', () => {
  it('rejects starting a recording without consent (422)', async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/recording/start')
      .set('Cookie', OWNER_COOKIE)
      .send({ recordingConsent: false });
    expect(res.status).toBe(422);
  });

  it('rejects an empty debate turn (422)', async () => {
    const res = await request(app)
      .post('/api/debates/d_1/turns')
      .set('Cookie', OWNER_COOKIE)
      .send({ content: '' });
    expect(res.status).toBe(422);
  });

  it('rejects an invalid recording control action (422)', async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/recording/control')
      .set('Cookie', OWNER_COOKIE)
      .send({ action: 'EXPLODE' });
    expect(res.status).toBe(422);
  });
});
