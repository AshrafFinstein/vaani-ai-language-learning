import { z } from 'zod';
import { LearningLevel } from './common.js';

/**
 * Progress + Analytics (Phase 10, master plan §18). These schemas are the single
 * source of truth for the Progress dashboard's request/response shapes. The API
 * computes them from persisted `ActivityEvent`s plus existing feature tables; the
 * web app consumes them through the `useProgress` hook (replacing the old mock).
 */

/** A category of recorded learning activity (mirrors the Prisma `ActivityKind`). */
export const ActivityKind = z.enum([
  'CHAT',
  'ROLEPLAY',
  'CALL',
  'DIALOGUE',
  'WORD',
  'SENTENCE',
  'FLASHCARD',
  'COURSE',
  'DEBATE',
  'PHOTO',
  'CHARACTER',
  'SCENARIO',
  'MEETING',
]);
export type ActivityKind = z.infer<typeof ActivityKind>;

/** One day's total practice minutes in the trailing weekly series. */
export const WeeklyPointDTO = z.object({
  /** Short weekday label, e.g. "Mon". */
  day: z.string(),
  /** ISO date (YYYY-MM-DD) the point represents. */
  date: z.string(),
  minutes: z.number().int().min(0),
});
export type WeeklyPointDTO = z.infer<typeof WeeklyPointDTO>;

/** Aggregated session counts per activity type. */
export const SessionCountsDTO = z.object({
  chat: z.number().int().min(0),
  roleplay: z.number().int().min(0),
  call: z.number().int().min(0),
  dialogue: z.number().int().min(0),
  word: z.number().int().min(0),
  sentence: z.number().int().min(0),
  flashcard: z.number().int().min(0),
  course: z.number().int().min(0),
  debate: z.number().int().min(0),
  photo: z.number().int().min(0),
  character: z.number().int().min(0),
  scenario: z.number().int().min(0),
  meeting: z.number().int().min(0),
});
export type SessionCountsDTO = z.infer<typeof SessionCountsDTO>;

/** The computed progress summary returned by `GET /api/progress`. */
export const ProgressSummaryDTO = z.object({
  /** Total learning minutes across all recorded activity. */
  totalMinutes: z.number().int().min(0),
  /** Minutes recorded today (learner's server-day). */
  minutesToday: z.number().int().min(0),
  /** Minutes over the trailing 7 days. */
  weeklyMinutes: z.number().int().min(0),
  /** The learner's daily-goal target (from Profile). */
  dailyGoalMinutes: z.number().int().min(0),
  /** Total experience points earned. */
  xp: z.number().int().min(0),
  /** Derived level ordinal (1-based) and its CEFR-ish label. */
  level: z.number().int().min(1),
  levelLabel: z.string(),
  learningLevel: LearningLevel,
  /** XP threshold for the next level (0 when maxed). */
  xpToNextLevel: z.number().int().min(0),
  /** Consecutive-day activity streak ending today (or yesterday). */
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  /** Total distinct sessions recorded. */
  totalSessions: z.number().int().min(0),
  sessionCounts: SessionCountsDTO,
  /** AI conversations started (chat + character). */
  conversationCount: z.number().int().min(0),
  roleplayCount: z.number().int().min(0),
  callCount: z.number().int().min(0),
  meetingCount: z.number().int().min(0),
  actionItemCount: z.number().int().min(0),
  flashcardsReviewed: z.number().int().min(0),
  /** Overall course completion percentage across enrolled courses (0 when none). */
  courseCompletionPercent: z.number().int().min(0).max(100),
  coursesCompleted: z.number().int().min(0),
  coursesEnrolled: z.number().int().min(0),
  /** Trailing 7-day minutes series, oldest → newest (today last). */
  weekly: z.array(WeeklyPointDTO),
});
export type ProgressSummaryDTO = z.infer<typeof ProgressSummaryDTO>;

/** A short, AI-summarized daily feedback payload from recent activity. */
export const DailyFeedbackDTO = z.object({
  /** One-paragraph encouraging summary of recent progress. */
  summary: z.string(),
  /** A few concrete highlights (what went well). */
  highlights: z.array(z.string()),
  /** A few suggestions for what to focus on next. */
  suggestions: z.array(z.string()),
  /** Whether any activity was found to summarize (false → generic empty-state copy). */
  hasActivity: z.boolean(),
});
export type DailyFeedbackDTO = z.infer<typeof DailyFeedbackDTO>;

/** An achievement with the learner's unlock state folded in. */
export const AchievementDTO = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  unlocked: z.boolean(),
  /** ISO timestamp when unlocked, null when still locked. */
  unlockedAt: z.string().nullable(),
});
export type AchievementDTO = z.infer<typeof AchievementDTO>;

/** Response for `GET /api/progress/achievements`. */
export const AchievementsResponseDTO = z.object({
  earned: z.array(AchievementDTO),
  available: z.array(AchievementDTO),
});
export type AchievementsResponseDTO = z.infer<typeof AchievementsResponseDTO>;
