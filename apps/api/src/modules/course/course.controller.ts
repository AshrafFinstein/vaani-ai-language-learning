import type { Request, Response } from 'express';
import type {
  EnrollCourseInput,
  GenerateLearningPathInput,
  SubmitExerciseInput,
} from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { courseService } from './course.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const courseController = {
  async catalog(req: Request, res: Response): Promise<void> {
    const courses = await courseService.listCatalog(userId(req));
    res.status(200).json({ data: { courses } });
  },

  async detail(req: Request, res: Response): Promise<void> {
    const course = await courseService.getCourseDetail(userId(req), req.params.slug!);
    res.status(200).json({ data: { course } });
  },

  async enroll(req: Request, res: Response): Promise<void> {
    const { slug } = req.body as EnrollCourseInput;
    const progress = await courseService.enroll(userId(req), slug);
    res.status(201).json({ data: { progress } });
  },

  async progress(req: Request, res: Response): Promise<void> {
    const progress = await courseService.getProgress(userId(req), req.params.slug!);
    res.status(200).json({ data: { progress } });
  },

  async completeLesson(req: Request, res: Response): Promise<void> {
    const progress = await courseService.completeLesson(userId(req), req.params.lessonId!);
    res.status(200).json({ data: { progress } });
  },

  async submitExercise(req: Request, res: Response): Promise<void> {
    const { answer } = req.body as SubmitExerciseInput;
    const result = await courseService.submitExercise(userId(req), req.params.exerciseId!, answer);
    res.status(200).json({ data: { result } });
  },

  async learningPath(req: Request, res: Response): Promise<void> {
    const path = await courseService.generateLearningPath(
      userId(req),
      req.body as GenerateLearningPathInput,
    );
    res.status(200).json({ data: { path } });
  },
};
