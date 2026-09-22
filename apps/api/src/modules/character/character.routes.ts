import { Router } from 'express';
import { StartCharacterChatInput } from '@vaani/types';
import { characterController } from './character.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const characterRouter = Router();

characterRouter.use(requireAuth);

characterRouter.get('/', asyncHandler(characterController.list));
characterRouter.post('/', validateBody(StartCharacterChatInput), asyncHandler(characterController.start));
