import type { Request, Response } from 'express';
import type { StartCharacterChatInput } from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { characterService } from './character.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const characterController = {
  async list(_req: Request, res: Response): Promise<void> {
    const characters = await characterService.listCharacters();
    res.status(200).json({ data: { characters } });
  },

  async start(req: Request, res: Response): Promise<void> {
    const conversation = await characterService.startCharacterChat(
      userId(req),
      req.body as StartCharacterChatInput,
    );
    res.status(201).json({ data: { conversation } });
  },
};
