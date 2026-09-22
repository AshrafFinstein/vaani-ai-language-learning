import { Router } from 'express';
import { exploreController } from './explore.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const exploreRouter = Router();

exploreRouter.use(requireAuth);

exploreRouter.get('/', asyncHandler(exploreController.daily));
