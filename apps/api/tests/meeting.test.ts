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
    status: 'SCHEDULED',
    teamsMeetingId: null,
    joinUrl: null,
    externalCalendarId: null,
    notifiedAt: null,
    startedAt: null,
    endedAt: null,
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
    questions: [],
    transcript: null,
  },
};

vi.mock('../src/prisma.js', () => {
  const prisma = {
    meeting: {
      // Reflect the fields the schedule path writes (joinUrl/teamsMeetingId) so the
      // response mirrors what was persisted; relations come from the fixture.
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        ...state.meeting,
        joinUrl: (data.joinUrl as string | null) ?? null,
        teamsMeetingId: (data.teamsMeetingId as string | null) ?? null,
      }),
      findFirst: async () => ({ ...state.meeting }),
      findUnique: async () => null,
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
    auditLog: { create: async () => ({}) },
    meetingSummary: { deleteMany: async () => ({ count: 0 }), create: async () => ({}) },
    meetingDecision: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({}) },
    actionItem: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({}) },
    meetingQuestion: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({}) },
    notification: { create: async () => ({}), count: async () => 0 },
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
    // No link supplied → both linkage fields stay null (backward compatible).
    expect(res.body.data.meeting.joinUrl).toBeNull();
    expect(res.body.data.meeting.teamsMeetingId).toBeNull();
  });

  it('stores a pasted Teams link and derives the meeting id', async () => {
    const joinUrl =
      'https://teams.microsoft.com/l/chat/19:meeting_ZDcwABC@thread.v2/conversations?ctx=chat';
    const res = await request(app)
      .post('/api/meetings')
      .set('Cookie', COOKIE)
      .send({
        title: 'Manual Teams meeting',
        date: '2026-10-01',
        startTime: '10:00',
        endTime: '11:00',
        provider: 'TEAMS',
        joinUrl,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.meeting.joinUrl).toBe(joinUrl);
    expect(res.body.data.meeting.teamsMeetingId).toBe('19:meeting_ZDcwABC@thread.v2');
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

describe('POST /api/meetings/:id/transcribe (real STT on provided audio)', () => {
  const AUDIO = `data:audio/webm;base64,${Buffer.from('fake-audio').toString('base64')}`;

  it('requires authentication', async () => {
    const res = await request(app).post('/api/meetings/m_1/transcribe').send({ audio: AUDIO });
    expect(res.status).toBe(401);
  });

  it('rejects a missing audio payload with 422 validation', async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/transcribe')
      .set('Cookie', COOKIE)
      .send({});
    expect(res.status).toBe(422);
  });

  it('forbids transcription when the meeting has it disabled / no transcript consent', async () => {
    // The mocked meeting has transcriptionEnabled=false and transcriptConsent=false → 403.
    const res = await request(app)
      .post('/api/meetings/m_1/transcribe')
      .set('Cookie', COOKIE)
      .send({ audio: AUDIO });
    expect(res.status).toBe(403);
  });
});

describe('Data-deletion / retention (privacy controls)', () => {
  it('requires authentication to delete a recording', async () => {
    const res = await request(app).delete('/api/meetings/m_1/recording');
    expect(res.status).toBe(401);
  });

  it('deletes the stored recording for a meeting the user owns', async () => {
    const res = await request(app)
      .delete('/api/meetings/m_1/recording')
      .set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ deleted: true });
  });

  it('deletes the stored transcript for a meeting the user owns', async () => {
    const res = await request(app)
      .delete('/api/meetings/m_1/transcript')
      .set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ deleted: true });
  });
});

describe('Calendar sync + scheduler + capture endpoints', () => {
  it('requires authentication for calendar status', async () => {
    const res = await request(app).get('/api/meetings/calendar/status');
    expect(res.status).toBe(401);
  });

  it('reports the calendar status as Mock + read-only by default (offline)', async () => {
    const res = await request(app).get('/api/meetings/calendar/status').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toMatchObject({ provider: 'mock', connected: false, readOnly: true });
  });

  it('syncs the mock calendar into local meetings (idempotent, creates rows)', async () => {
    const res = await request(app)
      .post('/api/meetings/calendar/sync')
      .set('Cookie', COOKIE)
      .send({ sinceIso: '2026-10-01T09:00:00.000Z', untilIso: '2026-10-01T21:00:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.body.data.result.provider).toBe('mock');
    expect(res.body.data.result.created).toBeGreaterThan(0);
  });

  it('runs a scheduler tick with an injected now', async () => {
    const res = await request(app)
      .post('/api/meetings/scheduler/tick')
      .set('Cookie', COOKIE)
      .send({ nowIso: '2026-10-01T10:00:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.body.data.result).toHaveProperty('notified');
  });

  it('reports capture as unsupported (deferred) via the capability endpoint', async () => {
    const res = await request(app).get('/api/meetings/capture/capability').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data.capability.audioSupported).toBe(false);
  });
});
