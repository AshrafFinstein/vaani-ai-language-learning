import type { ProgressSummaryDTO } from '@vaani/types';

/**
 * The seed of achievement definitions (original Vaani AI content). `code` is the stable
 * slug matched by the unlock logic and stored in the DB (seeded by prisma/seed.ts). Each
 * `isUnlocked` predicate is a pure function of the already-computed progress summary, so
 * unlock evaluation is deterministic and side-effect free.
 */
export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  isUnlocked: (summary: ProgressSummaryDTO) => boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    code: 'first_conversation',
    title: 'First Words',
    description: 'Complete your first AI conversation.',
    icon: '💬',
    sortOrder: 1,
    isUnlocked: (s) => s.conversationCount >= 1,
  },
  {
    code: 'streak_3',
    title: 'Getting Consistent',
    description: 'Practice on 3 days in a row.',
    icon: '🔥',
    sortOrder: 2,
    isUnlocked: (s) => s.longestStreak >= 3,
  },
  {
    code: 'streak_7',
    title: 'Week Warrior',
    description: 'Practice on 7 days in a row.',
    icon: '⚡',
    sortOrder: 3,
    isUnlocked: (s) => s.longestStreak >= 7,
  },
  {
    code: 'flashcards_50',
    title: 'Vocabulary Builder',
    description: 'Review 50 flashcards.',
    icon: '🃏',
    sortOrder: 4,
    isUnlocked: (s) => s.flashcardsReviewed >= 50,
  },
  {
    code: 'course_complete',
    title: 'Course Graduate',
    description: 'Complete a full course.',
    icon: '🎓',
    sortOrder: 5,
    isUnlocked: (s) => s.coursesCompleted >= 1,
  },
  {
    code: 'debater',
    title: 'Silver Tongue',
    description: 'Take part in a debate.',
    icon: '⚖️',
    sortOrder: 6,
    isUnlocked: (s) => s.sessionCounts.debate >= 1,
  },
  {
    code: 'meeting_analyst',
    title: 'Meeting Analyst',
    description: 'Analyze your first meeting.',
    icon: '📝',
    sortOrder: 7,
    isUnlocked: (s) => s.meetingCount >= 1,
  },
  {
    code: 'hour_learner',
    title: 'Hour of Power',
    description: 'Accumulate 60 minutes of learning.',
    icon: '⏱️',
    sortOrder: 8,
    isUnlocked: (s) => s.totalMinutes >= 60,
  },
];

export const ACHIEVEMENT_BY_CODE = new Map(ACHIEVEMENTS.map((a) => [a.code, a]));
