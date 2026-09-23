import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * Offline supertest for the audio→Whisper transcribe path carrying the recording's real
 * FORMAT. The STT provider is the offline Mock (forced in tests/setup.ts), so no network or
 * key is used. The mocked meeting has transcription + transcript consent enabled and AI
 * analysis DISABLED, so the request reaches the (mock) STT and persists a transcript.
 */
const meeting = {
  id: 'm_fmt',
  userId: 'user_1',
  title: 'Recorded sync',
  provider: 'TEAMS',
  scheduledStart: new Date('2026-10-01T10:00:00Z'),
  scheduledEnd: new Date('2026-10-01T11:00:00Z'),
  recordingEnabled: true,
  transcriptionEnabled: true,
  aiAnalysisEnabled: false,
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
    meetingId: 'm_fmt',
    state: 'STOPPED',
    recordingConsent: true,
    transcriptConsent: true,
    startedAt: null,
    endedAt: null,
    durationSeconds: 0,
  },
  summary: null,
  decisions: [],
  actionItems: [],
  questions: [],
  transcript: null,
};

vi.mock('../src/prisma.js', () => {
  const prisma = {
    meeting: {
      findFirst: async () => ({ ...meeting }),
      findUnique: async () => null,
      findMany: async () => [],
      update: async () => ({ ...meeting }),
      create: async () => ({ ...meeting }),
    },
    recordingSession: {
      upsert: async () => ({ ...meeting.recording }),
      update: async () => ({ ...meeting.recording }),
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

const mp4Payload = `data:video/mp4;base64,${Buffer.from('fake-mp4-bytes').toString('base64')}`;

describe('POST /api/meetings/:id/transcribe (format carried through)', () => {
  it('accepts a video/mp4 data-URL and reaches the mock STT (200)', async () => {
    const res = await request(app)
      .post('/api/meetings/m_fmt/transcribe')
      .set('Cookie', COOKIE)
      .send({ audio: mp4Payload });

    // 200 proves the request passed consent gating AND the (mock) STT returned non-empty
    // text — an unsupported format would 422 and empty text would 400 before this point.
    expect(res.status).toBe(200);
    expect(res.body.data.meeting).toMatchObject({ id: 'm_fmt' });
  });

  it('accepts an explicit mimeType field alongside bare base64 (200)', async () => {
    const res = await request(app)
      .post('/api/meetings/m_fmt/transcribe')
      .set('Cookie', COOKIE)
      .send({ audio: Buffer.from('fake-bytes').toString('base64'), mimeType: 'video/mp4' });

    expect(res.status).toBe(200);
  });

  it('rejects an unsupported audio/video container with 422', async () => {
    const res = await request(app)
      .post('/api/meetings/m_fmt/transcribe')
      .set('Cookie', COOKIE)
      .send({ audio: `data:video/x-msvideo;base64,${Buffer.from('avi').toString('base64')}` });

    expect(res.status).toBe(422);
  });

  it('rejects an explicit unsupported mimeType with 422 (schema validation)', async () => {
    const res = await request(app)
      .post('/api/meetings/m_fmt/transcribe')
      .set('Cookie', COOKIE)
      .send({ audio: Buffer.from('x').toString('base64'), mimeType: 'application/pdf' });

    expect(res.status).toBe(422);
  });
});
