import type { Request, Response } from 'express';
import type { PhotoMessageInput, StartPhotoSessionInput } from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { photoService } from './photo.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const photoController = {
  async list(req: Request, res: Response): Promise<void> {
    const sessions = await photoService.listSessions(userId(req));
    res.status(200).json({ data: { sessions } });
  },

  async start(req: Request, res: Response): Promise<void> {
    const session = await photoService.startSession(userId(req), req.body as StartPhotoSessionInput);
    res.status(201).json({ data: { session } });
  },

  async detail(req: Request, res: Response): Promise<void> {
    const session = await photoService.getSessionDetail(userId(req), req.params.id!);
    res.status(200).json({ data: { session } });
  },

  async send(req: Request, res: Response): Promise<void> {
    const { content } = req.body as PhotoMessageInput;
    const result = await photoService.reply(userId(req), req.params.id!, content);
    res.status(201).json({ data: result });
  },
};
