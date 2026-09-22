import type { Request, Response } from 'express';
import type { SubmitSentenceInput } from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { practiceService } from './practice.service.js';

export const practiceController = {
  async sentence(req: Request, res: Response): Promise<void> {
    if (!req.auth) throw ApiException.unauthorized();
    const evaluation = await practiceService.evaluateSentence(
      req.auth.userId,
      req.body as SubmitSentenceInput,
    );
    res.status(200).json({ data: { evaluation } });
  },
};
