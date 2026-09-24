import bcrypt from 'bcryptjs';
import type { LoginInput, RegisterInput, UserDTO } from '@vaani/types';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import {
  generateRefreshToken,
  hashToken,
  refreshExpiryDate,
  signAccessToken,
} from '../../lib/tokens.js';
import { toUserDTO, type UserWithProfile } from '../user/user.mapper.js';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: UserDTO;
  tokens: IssuedTokens;
}

const BCRYPT_ROUNDS = 12;

/**
 * A revoked refresh token presented again within this window is treated as a benign
 * race (two tabs refreshing at once), not theft — the request fails but other sessions
 * are left alone. Outside the window it is treated as token reuse (see `refresh`).
 */
const REFRESH_REUSE_GRACE_MS = 60_000;

// Hash compared against when the email is unknown, so a miss costs the same bcrypt
// work as a wrong password and response timing does not reveal which emails exist.
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash('vaani-timing-equalizer', BCRYPT_ROUNDS);
  return dummyHash;
}

async function issueSession(
  user: UserWithProfile,
  meta: { userAgent?: string; ipAddress?: string },
): Promise<AuthResult> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { token: refreshToken, hash } = generateRefreshToken();

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: refreshExpiryDate(),
    },
  });

  return { user: toUserDTO(user), tokens: { accessToken, refreshToken } };
}

export const authService = {
  async register(
    input: RegisterInput,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiException.conflict('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        profile: { create: {} },
      },
      include: { profile: true },
    });

    return issueSession(user, meta);
  },

  async login(
    input: LoginInput,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { profile: true },
    });
    // Uniform error (and uniform bcrypt cost) to avoid leaking which emails exist.
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !ok) throw ApiException.unauthorized('Invalid email or password');

    return issueSession(user, meta);
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await prisma.session.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async refresh(
    refreshToken: string | undefined,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    if (!refreshToken) throw ApiException.unauthorized('Missing refresh token');
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: hashToken(refreshToken) },
      include: { user: { include: { profile: true } } },
    });
    const now = new Date();
    if (!session || session.expiresAt < now) {
      throw ApiException.unauthorized('Invalid or expired session');
    }
    if (session.revokedAt) {
      // Reuse of an already-rotated token outside the grace window suggests it was
      // stolen: revoke every live session for the user so the thief is cut off too.
      if (now.getTime() - session.revokedAt.getTime() > REFRESH_REUSE_GRACE_MS) {
        await prisma.session.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      throw ApiException.unauthorized('Invalid or expired session');
    }
    // Rotate atomically: only the request that flips revokedAt from null wins, so two
    // concurrent refreshes with the same token cannot both mint new sessions.
    const { count } = await prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: now },
    });
    if (count === 0) throw ApiException.unauthorized('Invalid or expired session');
    return issueSession(session.user, meta);
  },

  async me(userId: string): Promise<UserDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw ApiException.notFound('User not found');
    return toUserDTO(user);
  },
};
