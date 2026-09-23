import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/', asyncHandler(notificationController.list));
notificationRouter.post('/read-all', asyncHandler(notificationController.markAllRead));
notificationRouter.post('/:id/read', asyncHandler(notificationController.markRead));
