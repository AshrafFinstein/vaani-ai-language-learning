import { Router } from 'express';
import { PhotoMessageInput, StartPhotoSessionInput } from '@vaani/types';
import { photoController } from './photo.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const photoRouter = Router();

photoRouter.use(requireAuth);

photoRouter.get('/', asyncHandler(photoController.list));
photoRouter.post('/', validateBody(StartPhotoSessionInput), asyncHandler(photoController.start));
photoRouter.get('/:id', asyncHandler(photoController.detail));
photoRouter.post('/:id/messages', validateBody(PhotoMessageInput), asyncHandler(photoController.send));
