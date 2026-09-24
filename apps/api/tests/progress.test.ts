import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * In-memory Prisma mock for the progress service query surface. A small set of
 * activity events (spread across a few days), one flashcard review, one action
 * item, and one enrolled+completed course exercise the summary, daily-feedback,
 * and achievements endpoints.
 */
vi.mock('../src/prisma.js', () => {
  // Anchor to the REAL run date (not a fixed calendar day) so the streak/weekly
  // assertions stay valid across day boundaries — the service computes against the
  // real "today", so the fixture's day(0) must also be the real today.
  const now = new Date();
  const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000);

  // Activity across today, yesterday, and two days ago (a 3-day streak).
  const activityEvents = [
    { kind: 'CHAT', minutes: 3, xp: 10, createdAt: day(0) },
    { kind: 'FLASHCARD', minutes: 1, xp: 4, createdAt: day(0) },
    { kind: 'DEBATE', minutes: 5, xp: 18, createdAt: day(-1) },
    { kind: 'COURSE', minutes: 5, xp: 20, createdAt: day(-2) },
    { kind: 'MEETING', minutes: 10, xp: 25, createdAt: day(-2) },
  ];

  const prisma = {
    activityEvent: {
      findMany: async () => activityEvents.map((e) => ({ ...e })),
    },
    profile: {
      findUnique: async () => ({
        dailyGoalMinutes: 30,
        level: 'INTERMEDIATE',
        learningLanguageCode: 'es',
      }),
    },
    language: {
      findFirst: async () => ({ name: 'Spanish' }),
    },
    flashcardReview: {
      count: async () => 1,
    },
    actionItem: {
      count: async () => 2,
    },
    courseEnrollment: {
      findMany: async () => [
        {
          status: 'COMPLETED',
          course: { modules: [{ lessons: [{ id: 'l1' }, { id: 'l2' }] }] },
        },
      ],
    },
    lessonProgress: {
      findMany: async () => [{ lessonId: 'l1' }, { lessonId: 'l2' }],
    },
    userAchievement: {
      findMany: async () => [],
      upsert: async ({ create }: { create: { unlockedAt: Date } }) => ({
        unlockedAt: create.unlockedAt,
      }),
    },
    achievement: {
      findUnique: async ({ where }: { where: { code: string } }) => ({
        id: `ach_${where.code}`,
        code: where.code,
      }),
    },
  };
  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];
const auth = { get: (url: string) => request(app).get(url).set('Cookie', COOKIE) };

describe('GET /api/progress', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/progress');
    expect(res.status).toBe(401);
  });

  it('returns the computed progress summary', async () => {
    const res = await auth.get('/api/progress');
    expect(res.status).toBe(200);
    const s = res.body.data.summary;
    // 3+1+5+5+10 minutes across the events.
    expect(s.totalMinutes).toBe(24);
    expect(s.totalSessions).toBe(5);
    expect(s.xp).toBe(77);
    expect(s.dailyGoalMinutes).toBe(30);
    expect(s.learningLevel).toBe('INTERMEDIATE');
    expect(s.flashcardsReviewed).toBe(1);
    expect(s.actionItemCount).toBe(2);
    expect(s.meetingCount).toBe(1);
    expect(s.conversationCount).toBe(1);
    expect(s.courseCompletionPercent).toBe(100);
    expect(s.coursesCompleted).toBe(1);
    expect(Array.isArray(s.weekly)).toBe(true);
    expect(s.weekly).toHaveLength(7);
    expect(s.sessionCounts.chat).toBe(1);
    expect(s.sessionCounts.debate).toBe(1);
    // currentStreak is >= 1 (activity today); should reflect the multi-day run.
    expect(s.currentStreak).toBeGreaterThanOrEqual(1);
    expect(s.longestStreak).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/progress/daily-feedback', () => {
  it('returns a daily-feedback payload', async () => {
    const res = await auth.get('/api/progress/daily-feedback');
    expect(res.status).toBe(200);
    const f = res.body.data.feedback;
    expect(typeof f.summary).toBe('string');
    expect(f.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(f.highlights)).toBe(true);
    expect(Array.isArray(f.suggestions)).toBe(true);
    expect(f.hasActivity).toBe(true);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/progress/daily-feedback');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/progress/achievements', () => {
  it('returns earned + available achievements', async () => {
    const res = await auth.get('/api/progress/achievements');
    expect(res.status).toBe(200);
    const a = res.body.data.achievements;
    expect(Array.isArray(a.earned)).toBe(true);
    expect(Array.isArray(a.available)).toBe(true);
    // first_conversation (chat >= 1), debater, course_complete, meeting_analyst should be earned.
    const earnedCodes = a.earned.map((x: { code: string }) => x.code);
    expect(earnedCodes).toContain('first_conversation');
    expect(earnedCodes).toContain('debater');
    expect(earnedCodes).toContain('course_complete');
    expect(earnedCodes).toContain('meeting_analyst');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/progress/achievements');
    expect(res.status).toBe(401);
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});
