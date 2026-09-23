import { Router } from 'express';
import { SynthesizeInput, TranscribeInput } from '@vaani/types';
import { speechController } from './speech.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { speechLimiter } from '../../middleware/rate-limit.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const speechRouter = Router();

// Auth-protected + tightly rate-limited (real STT/TTS calls are billable). Audio bodies
// are base64 and can exceed the global 1mb JSON limit; the app mounts a larger-limit JSON
// parser for /api/speech (and the meeting transcribe route) — see app.ts.
speechRouter.use(requireAuth);
speechRouter.use(speechLimiter);

speechRouter.post(
  '/transcribe',
  validateBody(TranscribeInput),
  asyncHandler(speechController.transcribe),
);
speechRouter.post(
  '/synthesize',
  validateBody(SynthesizeInput),
  asyncHandler(speechController.synthesize),
);
