import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * Audit-logging tests (Phase 11). Assert that sensitive meeting actions —
 * recording start/stop and recording/transcript deletion — append an AuditLog
 * row that references the actor + target only (never secrets or transcript text).
 */

interface AuditRow {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
}

const audits: AuditRow[] = [];

const meetingState = {
  id: 'm_1',
  userId: 'user_1',
  title: 'Weekly sync',
  provider: 'TEAMS',
  scheduledStart: new Date('2026-10-01T10:00:00Z'),
  scheduledEnd: new Date('2026-10-01T11:00:00Z'),
  recordingEnabled: true,
  transcriptionEnabled: false,
  aiAnalysisEnabled: false,
  analysisStatus: 'PENDING',
  createdAt: new Date('2026-09-22T00:00:00Z'),
  updatedAt: new Date('2026-09-22T00:00:00Z'),
  participants: [],
  // Mutable so a test can choose the starting recording state (IDLE for start,
  // RECORDING for stop).
  recording: {
    id: 'r_1',
    meetingId: 'm_1',
    state: 'IDLE' as string,
    recordingConsent: true,
    transcriptConsent: false,
    startedAt: new Date('2026-10-01T10:00:00Z') as Date | null,
    endedAt: null as Date | null,
    durationSeconds: 0,
  },
  summary: null,
  decisions: [],
  actionItems: [],
  transcript: null,
};

vi.mock('../src/prisma.js', () => {
  const prisma = {
    meeting: {
      findFirst: async ({ where }: { where: { userId?: string } }) =>
        where.userId && where.userId !== 'user_1' ? null : { ...meetingState },
      update: async () => ({ ...meetingState }),
    },
    recordingSession: {
      upsert: async ({ update }: { update: Record<string, unknown> }) => ({
        ...meetingState.recording,
        ...update,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        ...meetingState.recording,
        ...data,
      }),
      deleteMany: async () => ({ count: 1 }),
    },
    transcript: { deleteMany: async () => ({ count: 1 }) },
    auditLog: {
      create: async ({ data }: { data: AuditRow }) => {
        audits.push(data);
        return { id: `audit_${audits.length}`, createdAt: new Date(), ...data };
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];

beforeEach(() => {
  audits.length = 0;
  meetingState.recording.state = 'IDLE';
});

describe('Audit logging — sensitive meeting actions write a reference-only row', () => {
  it('records RECORDING_START on start', async () => {
    meetingState.recording.state = 'IDLE';
    const res = await request(app)
      .post('/api/meetings/m_1/recording/start')
      .set('Cookie', COOKIE)
      .send({ recordingConsent: true, transcriptConsent: false });
    expect(res.status).toBe(200);
    const row = audits.find((a) => a.action === 'RECORDING_START');
    expect(row).toBeDefined();
    expect(row).toMatchObject({ userId: 'user_1', targetType: 'MEETING', targetId: 'm_1' });
  });

  it('records RECORDING_STOP on stop, with duration reference (not content)', async () => {
    meetingState.recording.state = 'RECORDING';
    const res = await request(app)
      .post('/api/meetings/m_1/recording/control')
      .set('Cookie', COOKIE)
      .send({ action: 'STOP' });
    expect(res.status).toBe(200);
    const row = audits.find((a) => a.action === 'RECORDING_STOP');
    expect(row).toBeDefined();
    expect(row).toMatchObject({ userId: 'user_1', targetType: 'MEETING', targetId: 'm_1' });
    // Metadata carries a numeric duration reference, never transcript/audio content.
    expect(row?.metadata).toHaveProperty('durationSeconds');
    expect(JSON.stringify(row)).not.toContain('audio');
  });

  it('records RECORDING_DELETE on recording deletion', async () => {
    const res = await request(app)
      .delete('/api/meetings/m_1/recording')
      .set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(audits.some((a) => a.action === 'RECORDING_DELETE' && a.targetId === 'm_1')).toBe(true);
  });

  it('records TRANSCRIPT_DELETE on transcript deletion', async () => {
    const res = await request(app)
      .delete('/api/meetings/m_1/transcript')
      .set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(audits.some((a) => a.action === 'TRANSCRIPT_DELETE' && a.targetId === 'm_1')).toBe(true);
  });

  it('does NOT audit when the action is denied for a non-owner', async () => {
    const attacker = signAccessToken({ sub: 'user_2', role: 'USER' });
    const res = await request(app)
      .delete('/api/meetings/m_1/recording')
      .set('Cookie', [`vaani_access=${attacker}`]);
    expect(res.status).toBe(404);
    expect(audits.length).toBe(0);
  });
});
