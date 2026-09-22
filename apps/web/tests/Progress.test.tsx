import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type {
  AchievementsResponseDTO,
  DailyFeedbackDTO,
  ProgressSummaryDTO,
} from '@vaani/types';
import ProgressPage from '@/pages/app/Progress';
import { renderWithProviders } from './test-utils';

const useProgressMock = vi.fn();
const useDailyFeedbackMock = vi.fn();
const useAchievementsMock = vi.fn();

vi.mock('@/features/progress/useProgress', () => ({
  useProgress: () => useProgressMock(),
  useDailyFeedback: () => useDailyFeedbackMock(),
  useAchievements: () => useAchievementsMock(),
}));

const SUMMARY: ProgressSummaryDTO = {
  totalMinutes: 142,
  minutesToday: 18,
  weeklyMinutes: 142,
  dailyGoalMinutes: 30,
  xp: 2480,
  level: 5,
  levelLabel: 'Intermediate (B1)',
  learningLevel: 'INTERMEDIATE',
  xpToNextLevel: 520,
  currentStreak: 7,
  longestStreak: 9,
  totalSessions: 24,
  sessionCounts: {
    chat: 8,
    roleplay: 2,
    call: 0,
    dialogue: 1,
    word: 3,
    sentence: 2,
    flashcard: 5,
    course: 1,
    debate: 1,
    photo: 1,
    character: 0,
    scenario: 0,
    meeting: 0,
  },
  conversationCount: 8,
  roleplayCount: 2,
  callCount: 0,
  meetingCount: 0,
  actionItemCount: 3,
  flashcardsReviewed: 40,
  courseCompletionPercent: 33,
  coursesCompleted: 0,
  coursesEnrolled: 1,
  weekly: [
    { day: 'Mon', date: '2026-09-16', minutes: 22 },
    { day: 'Tue', date: '2026-09-17', minutes: 15 },
    { day: 'Wed', date: '2026-09-18', minutes: 30 },
    { day: 'Thu', date: '2026-09-19', minutes: 12 },
    { day: 'Fri', date: '2026-09-20', minutes: 25 },
    { day: 'Sat', date: '2026-09-21', minutes: 20 },
    { day: 'Sun', date: '2026-09-22', minutes: 18 },
  ],
};

const FEEDBACK: DailyFeedbackDTO = {
  summary: 'Nice progress on your Spanish practice.',
  highlights: ["You're on a 7-day streak."],
  suggestions: ['Add a flashcard review.'],
  hasActivity: true,
};

const ACHIEVEMENTS: AchievementsResponseDTO = {
  earned: [
    {
      code: 'first_conversation',
      title: 'First Words',
      description: 'Complete your first AI conversation.',
      icon: '💬',
      unlocked: true,
      unlockedAt: '2026-09-20T10:00:00.000Z',
    },
  ],
  available: [
    {
      code: 'streak_7',
      title: 'Week Warrior',
      description: 'Practice on 7 days in a row.',
      icon: '⚡',
      unlocked: false,
      unlockedAt: null,
    },
  ],
};

describe('ProgressPage', () => {
  beforeEach(() => {
    useProgressMock.mockReset();
    useDailyFeedbackMock.mockReset();
    useAchievementsMock.mockReset();
  });

  it('renders stat tiles, chart, feedback, and achievements from API data', () => {
    useProgressMock.mockReturnValue({ data: SUMMARY, isLoading: false });
    useDailyFeedbackMock.mockReturnValue({ data: FEEDBACK });
    useAchievementsMock.mockReturnValue({ data: ACHIEVEMENTS });

    renderWithProviders(<ProgressPage />);

    // Stat tiles.
    expect(screen.getByText('Current level')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('Total practice')).toBeInTheDocument();
    // Weekly chart section.
    expect(screen.getByText('Weekly activity')).toBeInTheDocument();
    // Daily feedback.
    expect(screen.getByText(/Nice progress on your Spanish practice/i)).toBeInTheDocument();
    // Achievements.
    expect(screen.getByText('First Words')).toBeInTheDocument();
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
  });

  it('shows a loading skeleton while the summary is loading', () => {
    useProgressMock.mockReturnValue({ data: undefined, isLoading: true });
    useDailyFeedbackMock.mockReturnValue({ data: undefined });
    useAchievementsMock.mockReturnValue({ data: undefined });

    renderWithProviders(<ProgressPage />);
    // The populated feedback text is absent in the loading state.
    expect(screen.queryByText(/Nice progress/i)).not.toBeInTheDocument();
  });
});
