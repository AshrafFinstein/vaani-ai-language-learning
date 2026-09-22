import { Router } from 'express';
import { languageController } from './language.controller.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const languageRouter = Router();

languageRouter.get('/', asyncHandler(languageController.list));
