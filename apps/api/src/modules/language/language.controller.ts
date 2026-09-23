import type { Request, Response } from 'express';
import { languageService } from './language.service.js';

export const languageController = {
  async list(_req: Request, res: Response): Promise<void> {
    const data = await languageService.listActive();
    res.status(200).json({ data });
  },
};
