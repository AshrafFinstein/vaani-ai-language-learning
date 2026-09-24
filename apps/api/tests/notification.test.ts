import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const store = {
  notifications: [
    {
      id: 'n_1',
      userId: 'user_1',
      type: 'MEETING_REMINDER',
      title: 'Upcoming meeting',
      body: '"Weekly sync" starts in 5 minutes.',
      meetingId: 'm_1',
      readAt: null as Date | null,
      createdAt: new Date('2026-10-01T09:55:00Z'),
    },
  ],
};

vi.mock('../src/prisma.js', () => {
  const prisma = {
    notification: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        store.notifications.filter((n) => n.userId === where.userId),
      count: async ({ where }: { where: { userId: string; readAt: null } }) =>
        store.notifications.filter((n) => n.userId === where.userId && n.readAt === null).length,
      findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
        store.notifications.find((n) => n.id === where.id && n.userId === where.userId) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: { readAt: Date } }) => {
        const n = store.notifications.find((x) => x.id === where.id)!;
        n.readAt = data.readAt;
        return n;
      },
      updateMany: async ({ where }: { where: { userId: string; readAt: null } }) => {
        let count = 0;
        for (const n of store.notifications) {
          if (n.userId === where.userId && n.readAt === null) {
            n.readAt = new Date();
            count += 1;
          }
        }
        return { count };
      },
    },
  };
  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];

describe('GET /api/notifications', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('lists the user notifications with an unread count', async () => {
    const res = await request(app).get('/api/notifications').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.unreadCount).toBe(1);
  });
});

describe('POST /api/notifications/:id/read', () => {
  it('marks a notification read (owner)', async () => {
    const res = await request(app).post('/api/notifications/n_1/read').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data.notification.readAt).not.toBeNull();
  });

  it('returns 404 for a notification the user does not own', async () => {
    const res = await request(app).post('/api/notifications/nope/read').set('Cookie', COOKIE);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/notifications/read-all', () => {
  it('marks all as read', async () => {
    const res = await request(app).post('/api/notifications/read-all').set('Cookie', COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('updated');
  });
});
