import { Router } from 'express';
import { UpdateProfileInput } from '@vaani/types';
import { userController } from './user.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const userRouter = Router();

userRouter.get('/me', requireAuth, asyncHandler(userController.me));
userRouter.patch(
  '/profile',
  requireAuth,
  validateBody(UpdateProfileInput),
  asyncHandler(userController.updateProfile),
);
