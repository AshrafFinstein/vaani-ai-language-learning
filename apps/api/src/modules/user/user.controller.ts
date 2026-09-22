import type { Request, Response } from 'express';
import type { UpdateProfileInput } from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { authService } from '../auth/auth.service.js';
import { userService } from './user.service.js';

export const userController = {
  async me(req: Request, res: Response): Promise<void> {
    if (!req.auth) throw ApiException.unauthorized();
    const user = await authService.me(req.auth.userId);
    res.status(200).json({ data: { user } });
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    if (!req.auth) throw ApiException.unauthorized();
    const user = await userService.updateProfile(req.auth.userId, req.body as UpdateProfileInput);
    res.status(200).json({ data: { user } });
  },
};
