import { z } from 'zod';

/**
 * Learning proficiency levels used across the product (chat difficulty, courses, etc.).
 * Aligned loosely with CEFR so future course mapping stays clean.
 */
export const LearningLevel = z.enum([
  'BEGINNER',
  'ELEMENTARY',
  'INTERMEDIATE',
  'UPPER_INTERMEDIATE',
  'ADVANCED',
]);
export type LearningLevel = z.infer<typeof LearningLevel>;

export const ThemePreference = z.enum(['LIGHT', 'DARK', 'SYSTEM']);
export type ThemePreference = z.infer<typeof ThemePreference>;
