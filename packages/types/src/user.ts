import { z } from 'zod';
import { LearningLevel, ThemePreference } from './common.js';

export const UpdateProfileInput = z.object({
  name: z.string().min(1).max(80).optional(),
  learningLanguageCode: z.string().min(2).max(10).optional(),
  level: LearningLevel.optional(),
  dailyGoalMinutes: z.number().int().min(5).max(600).optional(),
  theme: ThemePreference.optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
