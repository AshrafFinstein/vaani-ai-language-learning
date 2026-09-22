import type { NextFunction, Request, Response } from 'express';
import { ApiException } from '../lib/errors.js';
import { ACCESS_COOKIE } from '../lib/cookies.js';
import { verifyAccessToken } from '../lib/tokens.js';

/** Authenticated user context attached to the request by {@link requireAuth}. */
export interface AuthContext {
  userId: string;
  role: 'USER' | 'ADMIN';
}

// Augment Express' Request with our auth context.
declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (!token) {
    next(ApiException.unauthorized());
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiException.unauthorized('Session expired'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.auth?.role !== 'ADMIN') {
    next(ApiException.forbidden('Admin access required'));
    return;
  }
  next();
}
