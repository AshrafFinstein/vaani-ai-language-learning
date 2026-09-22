import type { Request, Response } from 'express';
import type { ForgotPasswordInput, LoginInput, RegisterInput } from '@vaani/types';
import { authService } from './auth.service.js';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from '../../lib/cookies.js';

function requestMeta(req: Request) {
  return { userAgent: req.get('user-agent') ?? undefined, ipAddress: req.ip };
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { user, tokens } = await authService.register(req.body as RegisterInput, requestMeta(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.status(201).json({ data: { user } });
  },

  async login(req: Request, res: Response): Promise<void> {
    const { user, tokens } = await authService.login(req.body as LoginInput, requestMeta(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.status(200).json({ data: { user } });
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    res.status(200).json({ data: { success: true } });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const { user, tokens } = await authService.refresh(req.cookies?.[REFRESH_COOKIE], requestMeta(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.status(200).json({ data: { user } });
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    // TODO(auth-phase): look up user, create a reset token, and email a reset link.
    // Always return 202 regardless of whether the email exists (avoids account enumeration).
    void (req.body as ForgotPasswordInput);
    res.status(202).json({ data: { message: 'If the email exists, a reset link has been sent.' } });
  },
};
