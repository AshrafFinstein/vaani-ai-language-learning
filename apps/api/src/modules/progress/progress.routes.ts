import { Router } from 'express';
import { progressController } from './progress.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.get('/', asyncHandler(progressController.summary));
progressRouter.get('/daily-feedback', asyncHandler(progressController.dailyFeedback));
progressRouter.get('/achievements', asyncHandler(progressController.achievements));
