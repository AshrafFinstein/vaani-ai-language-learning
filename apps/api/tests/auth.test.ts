import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * In-memory Prisma mock so auth flows can be tested without a live database.
 * Implements only the query shapes the auth/user services use.
 */
vi.mock('../src/prisma.js', () => {
  interface Profile {
    learningLanguageCode: string | null;
    level: string;
    dailyGoalMinutes: number;
    theme: string;
  }
  interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    avatarUrl: string | null;
    role: 'USER' | 'ADMIN';
    createdAt: Date;
    updatedAt: Date;
    profile: Profile;
  }
  interface Session {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
  }

  const users = new Map<string, User>();
  const sessions = new Map<string, Session>();
  let counter = 0;
  const nextId = (p: string) => `${p}_${++counter}`;

  const prisma = {
    __reset() {
      users.clear();
      sessions.clear();
      counter = 0;
    },
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
        for (const u of users.values()) {
          if (where.email && u.email === where.email) return structuredClone(u);
          if (where.id && u.id === where.id) return structuredClone(u);
        }
        return null;
      },
      create: async ({ data }: { data: { email: string; name: string; passwordHash: string } }) => {
        const now = new Date();
        const user: User = {
          id: nextId('user'),
          email: data.email,
          name: data.name,
          passwordHash: data.passwordHash,
          avatarUrl: null,
          role: 'USER',
          createdAt: now,
          updatedAt: now,
          profile: {
            learningLanguageCode: null,
            level: 'BEGINNER',
            dailyGoalMinutes: 30,
            theme: 'SYSTEM',
          },
        };
        users.set(user.id, user);
        return structuredClone(user);
      },
    },
    session: {
      create: async ({ data }: { data: Omit<Session, 'id' | 'createdAt' | 'revokedAt'> }) => {
        const session: Session = {
          id: nextId('sess'),
          createdAt: new Date(),
          revokedAt: null,
          ...data,
        };
        sessions.set(session.refreshTokenHash, session);
        return structuredClone(session);
      },
      findUnique: async ({ where }: { where: { refreshTokenHash: string } }) => {
        const s = sessions.get(where.refreshTokenHash);
        if (!s) return null;
        const user = users.get(s.userId);
        return { ...structuredClone(s), user: user ? structuredClone(user) : null };
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { refreshTokenHash?: string; id?: string; userId?: string; revokedAt?: null };
        data: { revokedAt: Date };
      }) => {
        let count = 0;
        for (const s of sessions.values()) {
          if (where.refreshTokenHash !== undefined && s.refreshTokenHash !== where.refreshTokenHash)
            continue;
          if (where.id !== undefined && s.id !== where.id) continue;
          if (where.userId !== undefined && s.userId !== where.userId) continue;
          if (where.revokedAt === null && s.revokedAt !== null) continue;
          s.revokedAt = data.revokedAt;
          count++;
        }
        return { count };
      },
      /** Test helper: backdate a session's revocation to simulate time passing. */
      __backdateRevocation(refreshTokenHash: string, ms: number) {
        const s = sessions.get(refreshTokenHash);
        if (s?.revokedAt) s.revokedAt = new Date(s.revokedAt.getTime() - ms);
      },
      /** Test helper: live (unrevoked) sessions. */
      __liveCount() {
        return [...sessions.values()].filter((s) => s.revokedAt === null).length;
      },
    },
  };

  return { prisma };
});

// Import AFTER the mock is registered.
const { createApp } = await import('../src/app.js');
const { prisma } = (await import('../src/prisma.js')) as unknown as {
  prisma: {
    __reset: () => void;
    session: {
      __backdateRevocation: (refreshTokenHash: string, ms: number) => void;
      __liveCount: () => number;
    };
  };
};
const { hashToken } = await import('../src/lib/tokens.js');

const app = createApp();
const validUser = { name: 'Alex Rivera', email: 'alex@example.com', password: 'Password1' };

beforeEach(() => {
  prisma.__reset();
});

describe('POST /api/auth/register', () => {
  it('creates an account and returns the user (201) with an auth cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      email: validUser.email,
      name: validUser.name,
      dailyGoalMinutes: 30,
      theme: 'SYSTEM',
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(setCookie?.join(';') ?? '').toContain('vaani_access');
  });

  it('rejects a weak password with 422 and field errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: 'weak' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(res.body.error.fields.password).toBeTruthy();
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('rejects an unknown email with the same 401 as a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects wrong password with 401', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/user/me', () => {
  it('returns 401 without a session cookie', async () => {
    const res = await request(app).get('/api/user/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);
    const res = await agent.get('/api/user/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the auth cookies', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
  });
});

/** Extracts the refresh token value from a response's Set-Cookie header. */
function refreshCookie(res: request.Response): string {
  const cookies = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const match = cookies.find((c) => c.startsWith('vaani_refresh='));
  if (!match) throw new Error('no refresh cookie');
  return match.split(';')[0]!.slice('vaani_refresh='.length);
}

describe('POST /api/auth/refresh', () => {
  it('returns 401 without a refresh cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('rotates the refresh token and issues new cookies', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const oldToken = refreshCookie(reg);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `vaani_refresh=${oldToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(refreshCookie(res)).not.toBe(oldToken);
    expect(prisma.session.__liveCount()).toBe(1);
  });

  it('rejects a just-rotated token without revoking other sessions (multi-tab race)', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const oldToken = refreshCookie(reg);
    await request(app).post('/api/auth/refresh').set('Cookie', `vaani_refresh=${oldToken}`);

    const replay = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `vaani_refresh=${oldToken}`);
    expect(replay.status).toBe(401);
    expect(prisma.session.__liveCount()).toBe(1);
  });

  it('revokes every session when an old rotated token is reused (theft detection)', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const oldToken = refreshCookie(reg);
    const rotated = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `vaani_refresh=${oldToken}`);
    await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(prisma.session.__liveCount()).toBe(2);

    prisma.session.__backdateRevocation(hashToken(oldToken), 5 * 60_000);
    const replay = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `vaani_refresh=${oldToken}`);
    expect(replay.status).toBe(401);
    expect(prisma.session.__liveCount()).toBe(0);

    const legit = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `vaani_refresh=${refreshCookie(rotated)}`);
    expect(legit.status).toBe(401);
  });
});
