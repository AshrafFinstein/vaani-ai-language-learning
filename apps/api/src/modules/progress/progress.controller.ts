import type { Request, Response } from 'express';
import { ApiException } from '../../lib/errors.js';
import { progressService } from './progress.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const progressController = {
  async summary(req: Request, res: Response): Promise<void> {
    const summary = await progressService.getSummary(userId(req));
    res.status(200).json({ data: { summary } });
  },

  async dailyFeedback(req: Request, res: Response): Promise<void> {
    const feedback = await progressService.getDailyFeedback(userId(req));
    res.status(200).json({ data: { feedback } });
  },

  async achievements(req: Request, res: Response): Promise<void> {
    const achievements = await progressService.getAchievements(userId(req));
    res.status(200).json({ data: { achievements } });
  },
};
