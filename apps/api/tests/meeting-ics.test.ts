import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * Supertest coverage for the admin-free ICS calendar path + the provided-transcript
 * endpoint. Prisma is mocked in-memory; the ICS-URL sync stubs `fetch` (NO network).
 */

// ── In-memory meeting used by the transcript endpoint (transcription enabled + consent) ──
const meeting = {
  id: 'm_1',
  userId: 'user_1',
  title: 'Weekly sync',
  provider: 'TEAMS',
  scheduledStart: new Date('2026-10-01T10:00:00Z'),
  scheduledEnd: new Date('2026-10-01T11:00:00Z'),
  recordingEnabled: true,
  transcriptionEnabled: true,
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
  participants: [{ id: 'p_1', name: 'Priya', email: null, role: null, speakerLabel: 'Speaker 1' }],
  recording: {
    id: 'r_1',
    meetingId: 'm_1',
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

// Per-test settings row (drives the ICS URL / status).
const settings: { icsCalendarUrl: string | null } = { icsCalendarUrl: null };
// Meetings created via calendar upsert (keyed by externalCalendarId) — proves idempotency.
const created = new Map<string, Record<string, unknown>>();

vi.mock('../src/prisma.js', () => {
  const prisma = {
    meeting: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          ...meeting,
          id: `created_${created.size + 1}`,
          externalCalendarId: data.externalCalendarId,
          title: data.title,
          scheduledStart: data.scheduledStart,
          scheduledEnd: data.scheduledEnd,
          provider: data.provider,
        };
        created.set(String(data.externalCalendarId), row);
        return row;
      },
      findFirst: async () => ({ ...meeting }),
      findUnique: async ({ where }: { where: { userId_externalCalendarId?: { externalCalendarId: string } } }) => {
        const ext = where.userId_externalCalendarId?.externalCalendarId;
        return ext && created.has(ext) ? created.get(ext) : null;
      },
      findMany: async () => [],
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        for (const [k, v] of created) if ((v as { id: string }).id === where.id) {
          created.set(k, { ...v, ...data });
        }
        return { ...meeting, ...data };
      },
    },
    recordingSession: {
      upsert: async () => ({ ...meeting.recording }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({ ...meeting.recording, ...data }),
      deleteMany: async () => ({ count: 1 }),
    },
    transcript: { deleteMany: async () => ({ count: 0 }), create: async () => ({}) },
    auditLog: { create: async () => ({}) },
    activityEvent: { create: async () => ({}) },
    meetingSummary: { deleteMany: async () => ({ count: 0 }), create: async () => ({}) },
    meetingDecision: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({}) },
    actionItem: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({}) },
    meetingQuestion: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({}) },
    notification: {
      create: async () => ({
        id: 'n_1',
        type: 'ANALYSIS_READY',
        title: 't',
        body: 'b',
        meetingId: 'm_1',
        readAt: null,
        createdAt: new Date('2026-09-22T00:00:00Z'),
      }),
      count: async () => 0,
    },
    meetingSettings: {
      findUnique: async () => ({ ...settings }),
      upsert: async ({ create: c, update: u }: { create?: Record<string, unknown>; update?: Record<string, unknown> }) => {
        Object.assign(settings, u ?? c ?? {});
        return { ...settings };
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

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:ics-evt-1',
  'SUMMARY:Imported meeting',
  'DTSTART:20261002T100000Z',
  'DTEND:20261002T110000Z',
  'X-MICROSOFT-SKYPETEAMSMEETINGURL:https://teams.microsoft.com/l/meetup-join/19:meeting_x@thread.v2',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

afterEach(() => {
  vi.restoreAllMocks();
  settings.icsCalendarUrl = null;
  created.clear();
});

describe('POST /api/meetings/calendar/ics (set feed URL + sync; fetch stubbed)', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/meetings/calendar/ics')
      .send({ url: 'https://host/cal.ics' });
    expect(res.status).toBe(401);
  });

  it('rejects a non-http(s) URL with 422 validation', async () => {
    const res = await request(app)
      .post('/api/meetings/calendar/ics')
      .set('Cookie', COOKIE)
      .send({ url: 'ftp://host/cal.ics' });
    expect(res.status).toBe(422);
  });

  it('sets the URL and syncs the feed into meetings (idempotent by UID)', async () => {
    const fetchMock = vi.fn(
      async () => new Response(ICS, { status: 200, headers: { 'content-type': 'text/calendar' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const first = await request(app)
      .post('/api/meetings/calendar/ics')
      .set('Cookie', COOKIE)
      .send({
        url: 'https://host/cal.ics',
        sinceIso: '2026-10-01T00:00:00Z',
        untilIso: '2026-10-31T00:00:00Z',
      });
    expect(first.status).toBe(200);
    expect(first.body.data.result.provider).toBe('ics');
    expect(first.body.data.result.created).toBe(1);
    expect(fetchMock).toHaveBeenCalled();

    // Re-running updates rather than duplicating (idempotent).
    const second = await request(app)
      .post('/api/meetings/calendar/ics')
      .set('Cookie', COOKIE)
      .send({
        url: 'https://host/cal.ics',
        sinceIso: '2026-10-01T00:00:00Z',
        untilIso: '2026-10-31T00:00:00Z',
      });
    expect(second.status).toBe(200);
    expect(second.body.data.result.created).toBe(0);
    expect(second.body.data.result.updated).toBe(1);
  });

  it('clears the URL when blank (no fetch, no events)', async () => {
    const res = await request(app)
      .post('/api/meetings/calendar/ics')
      .set('Cookie', COOKIE)
      .send({ url: '' });
    expect(res.status).toBe(200);
    expect(res.body.data.result.created).toBe(0);
  });
});

describe('POST /api/meetings/calendar/import (import .ics file; NO network)', () => {
  it('imports events from raw ICS content', async () => {
    const res = await request(app)
      .post('/api/meetings/calendar/import')
      .set('Cookie', COOKIE)
      .send({ content: ICS, sinceIso: '2026-10-01T00:00:00Z', untilIso: '2026-10-31T00:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.data.result.provider).toBe('ics');
    expect(res.body.data.result.created).toBe(1);
  });

  it('accepts a base64 data-URL payload', async () => {
    const dataUrl = `data:text/calendar;base64,${Buffer.from(ICS).toString('base64')}`;
    const res = await request(app)
      .post('/api/meetings/calendar/import')
      .set('Cookie', COOKIE)
      .send({ content: dataUrl, sinceIso: '2026-10-01T00:00:00Z', untilIso: '2026-10-31T00:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.data.result.created).toBe(1);
  });

  it('rejects non-iCalendar content with 400', async () => {
    const res = await request(app)
      .post('/api/meetings/calendar/import')
      .set('Cookie', COOKIE)
      .send({ content: 'this is not a calendar' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/meetings/calendar/status reflects a per-user ICS URL', () => {
  it('reports ics + connected when the user has a stored ICS URL', async () => {
    settings.icsCalendarUrl = 'https://host/mine.ics';
    const res = await request(app).get('/api/meetings/calendar/status').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toMatchObject({ provider: 'ics', connected: true, readOnly: true });
  });
});

describe('POST /api/meetings/:id/transcript (provided transcript → analysis)', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/meetings/m_1/transcript').send({ content: 'hi' });
    expect(res.status).toBe(401);
  });

  it('rejects empty content with 422 validation', async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/transcript')
      .set('Cookie', COOKIE)
      .send({ content: '' });
    expect(res.status).toBe(422);
  });

  it('ingests a WebVTT transcript and returns the analyzed meeting', async () => {
    const vtt = [
      'WEBVTT',
      '',
      '00:00:00.000 --> 00:00:05.000',
      '<v Priya>We should ship the ICS path this sprint.',
      '',
      '00:00:05.000 --> 00:00:09.000',
      '<v Alex>Agreed, I will own the parser.',
    ].join('\n');
    const res = await request(app)
      .post('/api/meetings/m_1/transcript')
      .set('Cookie', COOKIE)
      .send({ content: vtt, format: 'vtt' });
    expect(res.status).toBe(200);
    expect(res.body.data.meeting).toHaveProperty('summary');
  });

  it('ingests plain text as a single segment', async () => {
    const res = await request(app)
      .post('/api/meetings/m_1/transcript')
      .set('Cookie', COOKIE)
      .send({ content: 'Some plain meeting notes without diarization.', format: 'text' });
    expect(res.status).toBe(200);
    expect(res.body.data.meeting).toHaveProperty('id', 'm_1');
  });
});
