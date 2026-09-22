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
    // Uniform error to avoid leaking which emails exist.
    if (!user) throw ApiException.unauthorized('Invalid email or password');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw ApiException.unauthorized('Invalid email or password');

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
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw ApiException.unauthorized('Invalid or expired session');
    }
    // Rotate: revoke the used session and issue a fresh one.
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
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
