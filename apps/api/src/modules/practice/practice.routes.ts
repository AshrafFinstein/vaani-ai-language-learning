import { Router } from 'express';
import { SubmitSentenceInput } from '@vaani/types';
import { practiceController } from './practice.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const practiceRouter = Router();

practiceRouter.use(requireAuth);
practiceRouter.post(
  '/sentence',
  validateBody(SubmitSentenceInput),
  asyncHandler(practiceController.sentence),
);
