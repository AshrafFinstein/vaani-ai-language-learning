import type {
  CourseDetailDTO,
  CourseProgressDTO,
  CourseSummaryDTO,
  ExerciseResult,
  GenerateLearningPathInput,
  LearningPath,
} from '@vaani/types';
import { api } from '@/lib/api';

export const coursesApi = {
  catalog: () => api.get<{ courses: CourseSummaryDTO[] }>('/api/courses'),
  detail: (slug: string) => api.get<{ course: CourseDetailDTO }>(`/api/courses/${slug}`),
  progress: (slug: string) =>
    api.get<{ progress: CourseProgressDTO }>(`/api/courses/${slug}/progress`),
  enroll: (slug: string) =>
    api.post<{ progress: CourseProgressDTO }>('/api/courses/enroll', { slug }),
  completeLesson: (lessonId: string) =>
    api.post<{ progress: CourseProgressDTO }>(`/api/courses/lessons/${lessonId}/complete`),
  submitExercise: (exerciseId: string, answer: string) =>
    api.post<{ result: ExerciseResult }>(`/api/courses/exercises/${exerciseId}/submit`, { answer }),
  learningPath: (input: GenerateLearningPathInput) =>
    api.post<{ path: LearningPath }>('/api/courses/learning-path', input),
};
