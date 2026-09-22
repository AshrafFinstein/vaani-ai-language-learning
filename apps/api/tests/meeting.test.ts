import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// In-memory Prisma mock covering the meeting service's calls. Only the surface
// exercised by these tests is implemented.
const state = {
  meeting: {
    id: 'm_1',
    userId: 'user_1',
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
    participants: [
      { id: 'p_1', name: 'Priya', email: null, role: null, speakerLabel: 'Speaker 1' },
    ],
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
  },
};

vi.mock('../src/prisma.js', () => {
  const prisma = {
    meeting: {
      create: async () => ({ ...state.meeting }),
      findFirst: async () => ({ ...state.meeting }),
      findMany: async () => [],
      update: async () => ({ ...state.meeting }),
    },
    recordingSession: {
      upsert: async ({ update }: { update: Record<string, unknown> }) => ({
        ...state.meeting.recording,
        ...update,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        ...state.meeting.recording,
        ...data,
      }),
      deleteMany: async () => ({ count: 1 }),
    },
    transcript: { deleteMany: async () => ({ count: 0 }), create: async () => ({}) },
    meetingSummary: { deleteMany: async () => ({ count: 0 }), create: async () => ({}) },
    meetingDecision: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({}) },
    actionItem: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({}) },
    meetingSettings: { findUnique: async () => null, upsert: async () => ({}) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];

describe('POST /api/meetings (schedule)', () => {
  it('schedules a meeting', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Cookie', COOKIE)
      .send({
        title: 'Weekly sync',
        date: '2026-10-01',
        startTime: '10:00',
        endTime: '11:00',
        provider: 'TEAMS',
        participants: [{ name: 'Priya' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.meeting).toMatchObject({ title: 'Weekly sync', provider: 'TEAMS' });
  });

  it('rejects end time before start time with 422', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('Cookie', COOKIE)
      .send({ title: 'x', date: '2026-10-01', startTime: '11:00', endTime: '10:00' });
    expect(res.status).toBe(422);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .send({ title: 'x', date: '2026-10-01', startTime: '10:00', endTime: '11:00' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/meetings/:id/recording/start (consent enforcement)', () => {
  it('rejects starting a recording without consent (422 validation)', async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/recording/start')
      .set('Cookie', COOKIE)
      .send({ recordingConsent: false });
    expect(res.status).toBe(422);
  });

  it('rejects an omitted consent flag (422 validation)', async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/recording/start')
      .set('Cookie', COOKIE)
      .send({});
    expect(res.status).toBe(422);
  });

  it('starts recording when consent is explicitly granted', async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/recording/start')
      .set('Cookie', COOKIE)
      .send({ recordingConsent: true, transcriptConsent: true });
    expect(res.status).toBe(200);
    expect(res.body.data.recording).toMatchObject({ state: 'RECORDING', recordingConsent: true });
  });
});
