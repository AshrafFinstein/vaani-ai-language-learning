import { Router } from 'express';
import { SendMessageInput, StartConversationInput } from '@vaani/types';
import { chatController } from './chat.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);

// Order matters: literal /history must be declared before the /:id param route.
chatRouter.get('/history', asyncHandler(chatController.history));
chatRouter.post('/', validateBody(StartConversationInput), asyncHandler(chatController.start));
chatRouter.get('/:id', asyncHandler(chatController.detail));
chatRouter.post('/:id/messages', validateBody(SendMessageInput), asyncHandler(chatController.send));
chatRouter.post('/:id/stream', validateBody(SendMessageInput), asyncHandler(chatController.stream));
chatRouter.post('/:id/feedback', asyncHandler(chatController.feedback));
