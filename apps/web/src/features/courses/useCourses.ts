import { useMutation, useQuery } from '@tanstack/react-query';
import type { GenerateLearningPathInput } from '@vaani/types';
import { queryClient } from '@/lib/queryClient';
import { coursesApi } from './courses.api';

export function useCourseCatalog() {
  return useQuery({
    queryKey: ['courses', 'catalog'],
    queryFn: coursesApi.catalog,
  });
}

export function useCourseDetail(slug: string | undefined) {
  return useQuery({
    queryKey: ['courses', 'detail', slug],
    queryFn: () => coursesApi.detail(slug!),
    enabled: Boolean(slug),
  });
}

/** Invalidates the catalog and the affected course detail after a progress change. */
function invalidateCourse(slug?: string) {
  void queryClient.invalidateQueries({ queryKey: ['courses', 'catalog'] });
  if (slug) void queryClient.invalidateQueries({ queryKey: ['courses', 'detail', slug] });
}

export function useEnrollCourse(slug: string | undefined) {
  return useMutation({
    mutationFn: () => coursesApi.enroll(slug!),
    onSuccess: () => invalidateCourse(slug),
  });
}

export function useCompleteLesson(slug: string | undefined) {
  return useMutation({
    mutationFn: (lessonId: string) => coursesApi.completeLesson(lessonId),
    onSuccess: () => invalidateCourse(slug),
  });
}

export function useSubmitExercise() {
  return useMutation({
    mutationFn: ({ exerciseId, answer }: { exerciseId: string; answer: string }) =>
      coursesApi.submitExercise(exerciseId, answer),
  });
}

export function useGenerateLearningPath() {
  return useMutation({
    mutationFn: (input: GenerateLearningPathInput) => coursesApi.learningPath(input),
  });
}
