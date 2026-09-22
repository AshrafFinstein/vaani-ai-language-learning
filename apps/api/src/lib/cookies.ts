import type { Response } from 'express';
import { env, isProd } from '../env.js';

export const ACCESS_COOKIE = 'vaani_access';
export const REFRESH_COOKIE = 'vaani_refresh';

const baseOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseOptions,
    maxAge: 15 * 60 * 1000, // aligns with JWT_ACCESS_TTL default
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseOptions,
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, baseOptions);
  res.clearCookie(REFRESH_COOKIE, baseOptions);
}
