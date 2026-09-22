import { useQuery } from '@tanstack/react-query';
import type {
  AchievementsResponseDTO,
  DailyFeedbackDTO,
  ProgressSummaryDTO,
} from '@vaani/types';
import { api } from '@/lib/api';

/** The computed progress summary (learning minutes, streak, level/XP, weekly series, …). */
export function useProgress() {
  return useQuery({
    queryKey: ['progress', 'summary'],
    queryFn: () => api.get<{ summary: ProgressSummaryDTO }>('/api/progress'),
    select: (d) => d.summary,
    staleTime: 60 * 1000,
  });
}

/** Short daily-feedback summary aggregated from recent activity (via @vaani/ai). */
export function useDailyFeedback() {
  return useQuery({
    queryKey: ['progress', 'daily-feedback'],
    queryFn: () => api.get<{ feedback: DailyFeedbackDTO }>('/api/progress/daily-feedback'),
    select: (d) => d.feedback,
    staleTime: 5 * 60 * 1000,
  });
}

/** Earned + available achievements for the current learner. */
export function useAchievements() {
  return useQuery({
    queryKey: ['progress', 'achievements'],
    queryFn: () =>
      api.get<{ achievements: AchievementsResponseDTO }>('/api/progress/achievements'),
    select: (d) => d.achievements,
    staleTime: 60 * 1000,
  });
}
