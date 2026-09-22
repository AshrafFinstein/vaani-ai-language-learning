import { Router } from 'express';
import { ForgotPasswordInput, LoginInput, RegisterInput } from '@vaani/types';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const authRouter = Router();

authRouter.use(authLimiter);
authRouter.post('/register', validateBody(RegisterInput), asyncHandler(authController.register));
authRouter.post('/login', validateBody(LoginInput), asyncHandler(authController.login));
authRouter.post('/logout', asyncHandler(authController.logout));
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post(
  '/forgot-password',
  validateBody(ForgotPasswordInput),
  asyncHandler(authController.forgotPassword),
);
