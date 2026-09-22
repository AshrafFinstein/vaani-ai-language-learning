import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export interface AccessTokenPayload {
  sub: string; // user id
  role: 'USER' | 'ADMIN';
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') throw new Error('Malformed token');
  return { sub: String(decoded.sub), role: decoded.role as 'USER' | 'ADMIN' };
}

/** Opaque refresh token (returned to client) + its hash (persisted). */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString('hex');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate(): Date {
  return new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}
