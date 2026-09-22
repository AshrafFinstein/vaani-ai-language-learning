import { Router } from 'express';
import {
  EnrollCourseInput,
  GenerateLearningPathInput,
  SubmitExerciseInput,
} from '@vaani/types';
import { courseController } from './course.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const courseRouter = Router();

courseRouter.use(requireAuth);

courseRouter.get('/', asyncHandler(courseController.catalog));
courseRouter.post('/enroll', validateBody(EnrollCourseInput), asyncHandler(courseController.enroll));
courseRouter.post(
  '/learning-path',
  validateBody(GenerateLearningPathInput),
  asyncHandler(courseController.learningPath),
);
courseRouter.post(
  '/lessons/:lessonId/complete',
  asyncHandler(courseController.completeLesson),
);
courseRouter.post(
  '/exercises/:exerciseId/submit',
  validateBody(SubmitExerciseInput),
  asyncHandler(courseController.submitExercise),
);
courseRouter.get('/:slug', asyncHandler(courseController.detail));
courseRouter.get('/:slug/progress', asyncHandler(courseController.progress));
