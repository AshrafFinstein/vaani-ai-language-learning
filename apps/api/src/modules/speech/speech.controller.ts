import type { Request, Response } from 'express';
import type { SynthesizeInput, TranscribeInput } from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { speechService } from './speech.service.js';

function requireAuth(req: Request): void {
  if (!req.auth) throw ApiException.unauthorized();
}

export const speechController = {
  /** POST /api/speech/transcribe — real STT on provided audio (mock by default). */
  async transcribe(req: Request, res: Response): Promise<void> {
    requireAuth(req);
    const { audio, languageCode, mimeType } = req.body as TranscribeInput;
    const result = await speechService.transcribe(audio, languageCode, mimeType);
    res.status(200).json({ data: result });
  },

  /** POST /api/speech/synthesize — TTS; returns base64 audio + mimeType. */
  async synthesize(req: Request, res: Response): Promise<void> {
    requireAuth(req);
    const { text, languageCode } = req.body as SynthesizeInput;
    const result = await speechService.synthesize(text, languageCode);
    res.status(200).json({ data: result });
  },
};
