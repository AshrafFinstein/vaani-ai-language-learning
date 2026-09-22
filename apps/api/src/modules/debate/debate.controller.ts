import type { Request, Response } from 'express';
import type { DebateTurnInput, StartDebateInput } from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { debateService } from './debate.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const debateController = {
  async list(req: Request, res: Response): Promise<void> {
    const debates = await debateService.listDebates(userId(req));
    res.status(200).json({ data: { debates } });
  },

  async start(req: Request, res: Response): Promise<void> {
    const debate = await debateService.startDebate(userId(req), req.body as StartDebateInput);
    res.status(201).json({ data: { debate } });
  },

  async detail(req: Request, res: Response): Promise<void> {
    const debate = await debateService.getDebateDetail(userId(req), req.params.id!);
    res.status(200).json({ data: { debate } });
  },

  async turn(req: Request, res: Response): Promise<void> {
    const { content } = req.body as DebateTurnInput;
    const result = await debateService.turn(userId(req), req.params.id!, content);
    res.status(201).json({ data: result });
  },

  async feedback(req: Request, res: Response): Promise<void> {
    const feedback = await debateService.feedback(userId(req), req.params.id!);
    res.status(200).json({ data: { feedback } });
  },
};
