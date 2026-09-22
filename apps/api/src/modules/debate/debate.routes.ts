import { Router } from 'express';
import { DebateTurnInput, StartDebateInput } from '@vaani/types';
import { debateController } from './debate.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const debateRouter = Router();

debateRouter.use(requireAuth);

debateRouter.get('/', asyncHandler(debateController.list));
debateRouter.post('/', validateBody(StartDebateInput), asyncHandler(debateController.start));
debateRouter.get('/:id', asyncHandler(debateController.detail));
debateRouter.post('/:id/turns', validateBody(DebateTurnInput), asyncHandler(debateController.turn));
debateRouter.post('/:id/feedback', asyncHandler(debateController.feedback));
