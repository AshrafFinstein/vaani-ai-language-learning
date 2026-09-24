import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockCalendarProvider } from '@vaani/meeting';

// ── In-memory Prisma covering calendar sync + scheduler tick + notifications ──
interface MeetingRow {
  id: string;
  userId: string;
  title: string;
  provider: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  aiAnalysisEnabled: boolean;
  analysisStatus: string;
  status: string;
  teamsMeetingId: string | null;
  joinUrl: string | null;
  externalCalendarId: string | null;
  notifiedAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const db = {
  meetings: [] as MeetingRow[],
  notifications: [] as Array<Record<string, unknown>>,
  settings: null as Record<string, unknown> | null,
  seq: 0,
};

function newMeeting(partial: Partial<MeetingRow>): MeetingRow {
  db.seq += 1;
  return {
    id: `m_${db.seq}`,
    userId: 'user_1',
    title: 'Untitled',
    provider: 'TEAMS',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
    recordingEnabled: false,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

function matchWhere(m: MeetingRow, where: Record<string, unknown>): boolean {
  if (where.userId && m.userId !== where.userId) return false;
  if (where.status) {
    const s = where.status as string | { in?: string[] };
    if (typeof s === 'string' && m.status !== s) return false;
    if (typeof s === 'object' && s.in && !s.in.includes(m.status)) return false;
  }
  const check = (field: Date, cond: { gt?: Date; gte?: Date; lt?: Date; lte?: Date }) => {
    if (cond.gt && !(field.getTime() > cond.gt.getTime())) return false;
    if (cond.lte && !(field.getTime() <= cond.lte.getTime())) return false;
    if (cond.lt && !(field.getTime() < cond.lt.getTime())) return false;
    if (cond.gte && !(field.getTime() >= cond.gte.getTime())) return false;
    return true;
  };
  if (where.scheduledStart && !check(m.scheduledStart, where.scheduledStart as never)) return false;
  if (where.scheduledEnd && !check(m.scheduledEnd, where.scheduledEnd as never)) return false;
  return true;
}

vi.mock('../src/prisma.js', () => {
  const prisma = {
    meeting: {
      findUnique: async ({ where }: { where: { userId_externalCalendarId?: { userId: string; externalCalendarId: string } } }) => {
        const key = where.userId_externalCalendarId;
        if (!key) return null;
        return (
          db.meetings.find(
            (m) => m.userId === key.userId && m.externalCalendarId === key.externalCalendarId,
          ) ?? null
        );
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        db.meetings.filter((m) => matchWhere(m, where)),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const m = newMeeting({
          userId: data.userId as string,
          title: data.title as string,
          provider: data.provider as string,
          scheduledStart: data.scheduledStart as Date,
          scheduledEnd: data.scheduledEnd as Date,
          externalCalendarId: (data.externalCalendarId as string) ?? null,
          joinUrl: (data.joinUrl as string) ?? null,
          teamsMeetingId: (data.teamsMeetingId as string) ?? null,
          status: (data.status as string) ?? 'SCHEDULED',
        });
        db.meetings.push(m);
        return m;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const m = db.meetings.find((x) => x.id === where.id)!;
        Object.assign(m, data);
        return m;
      },
    },
    notification: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const n = { id: `n_${db.notifications.length + 1}`, readAt: null, createdAt: new Date(), ...data };
        db.notifications.push(n);
        return n;
      },
      count: async () => db.notifications.filter((n) => n.readAt === null).length,
    },
    meetingSettings: {
      findUnique: async () => db.settings,
    },
  };
  return { prisma };
});

const { calendarService } = await import('../src/modules/meeting/calendar.service.js');
const { schedulerService } = await import('../src/modules/meeting/scheduler.service.js');

beforeEach(() => {
  db.meetings = [];
  db.notifications = [];
  db.settings = null;
  db.seq = 0;
});

describe('CalendarService.sync — idempotent by externalCalendarId', () => {
  const now = new Date('2026-10-01T09:00:00.000Z');

  it('creates local Meeting rows from the mock calendar events', async () => {
    const res = await calendarService.sync('user_1', undefined, undefined, now, new MockCalendarProvider());
    expect(res.created).toBeGreaterThan(0);
    expect(res.updated).toBe(0);
    expect(db.meetings.length).toBe(res.created);
    expect(db.meetings.every((m) => m.externalCalendarId)).toBe(true);
  });

  it('re-running the same sync UPDATES existing rows rather than duplicating', async () => {
    const provider = new MockCalendarProvider();
    const first = await calendarService.sync('user_1', undefined, undefined, now, provider);
    const countAfterFirst = db.meetings.length;

    const second = await calendarService.sync('user_1', undefined, undefined, now, provider);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(first.created);
    // No duplication.
    expect(db.meetings.length).toBe(countAfterFirst);
  });
});

describe('MeetingScheduler.tick — reminder → NOTIFIED + reminder notification (injected now)', () => {
  it('notifies a meeting inside the reminder window and creates a MEETING_REMINDER', async () => {
    const now = new Date('2026-10-01T10:00:00.000Z');
    db.meetings.push(
      newMeeting({
        status: 'SCHEDULED',
        scheduledStart: new Date('2026-10-01T10:05:00.000Z'), // 5 min out (< default 10)
        scheduledEnd: new Date('2026-10-01T11:00:00.000Z'),
      }),
    );

    const res = await schedulerService.tick('user_1', now);
    expect(res.notified).toHaveLength(1);
    expect(db.meetings[0]!.status).toBe('NOTIFIED');
    expect(db.notifications).toHaveLength(1);
    expect(db.notifications[0]!.type).toBe('MEETING_REMINDER');
  });

  it('starts a meeting whose start has passed (→ STARTED + MEETING_STARTED)', async () => {
    const now = new Date('2026-10-01T10:30:00.000Z');
    db.meetings.push(
      newMeeting({
        status: 'NOTIFIED',
        scheduledStart: new Date('2026-10-01T10:00:00.000Z'),
        scheduledEnd: new Date('2026-10-01T11:00:00.000Z'),
      }),
    );

    const res = await schedulerService.tick('user_1', now);
    expect(res.started).toHaveLength(1);
    expect(db.meetings[0]!.status).toBe('STARTED');
    expect(db.notifications.some((n) => n.type === 'MEETING_STARTED')).toBe(true);
  });

  it('moves an ended meeting to PROCESSING', async () => {
    const now = new Date('2026-10-01T11:30:00.000Z');
    db.meetings.push(
      newMeeting({
        status: 'STARTED',
        scheduledStart: new Date('2026-10-01T10:00:00.000Z'),
        scheduledEnd: new Date('2026-10-01T11:00:00.000Z'),
      }),
    );

    const res = await schedulerService.tick('user_1', now);
    expect(res.processing).toHaveLength(1);
    expect(db.meetings[0]!.status).toBe('PROCESSING');
  });

  it('is idempotent — a second tick with no time change makes no further transitions', async () => {
    const now = new Date('2026-10-01T09:00:00.000Z');
    db.meetings.push(
      newMeeting({
        status: 'SCHEDULED',
        scheduledStart: new Date('2026-10-01T12:00:00.000Z'), // far out → no change
        scheduledEnd: new Date('2026-10-01T13:00:00.000Z'),
      }),
    );
    const first = await schedulerService.tick('user_1', now);
    const second = await schedulerService.tick('user_1', now);
    expect(first.notified).toHaveLength(0);
    expect(second.notified).toHaveLength(0);
    expect(db.meetings[0]!.status).toBe('SCHEDULED');
  });
});
