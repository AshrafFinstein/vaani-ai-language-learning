import type { Request, Response } from 'express';
import { ApiException } from '../../lib/errors.js';
import { notificationService } from './notification.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    const result = await notificationService.list(userId(req));
    res.status(200).json({ data: result });
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const notification = await notificationService.markRead(userId(req), req.params.id!);
    res.status(200).json({ data: { notification } });
  },

  async markAllRead(req: Request, res: Response): Promise<void> {
    const result = await notificationService.markAllRead(userId(req));
    res.status(200).json({ data: result });
  },
};
