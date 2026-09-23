import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { ProgressSummaryDTO } from '@vaani/types';
import DashboardPage from '@/pages/app/Dashboard';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from './test-utils';

// Avoid a real network call for the languages query.
vi.mock('@/features/language/useLanguages', () => ({
  useLanguages: () => ({
    data: [{ code: 'es', name: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', rtl: false }],
  }),
}));

// The real-data progress hook is mocked so we can drive empty + populated states.
const useProgressMock = vi.fn();
vi.mock('@/features/progress/useProgress', () => ({
  useProgress: () => useProgressMock(),
}));

const POPULATED: ProgressSummaryDTO = {
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
  actionItemCount: 0,
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

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        name: 'Alex Rivera',
        email: 'alex@example.com',
        avatarUrl: null,
        role: 'USER',
        learningLanguageCode: 'es',
        level: 'INTERMEDIATE',
        dailyGoalMinutes: 30,
        theme: 'SYSTEM',
        createdAt: new Date().toISOString(),
      },
      isHydrating: false,
    });
    useProgressMock.mockReset();
  });

  it('greets the user by first name', () => {
    useProgressMock.mockReturnValue({ data: POPULATED, isLoading: false });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /alex/i })).toBeInTheDocument();
  });

  it('renders real progress data (level, streak, quick practice)', () => {
    useProgressMock.mockReturnValue({ data: POPULATED, isLoading: false });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Current level')).toBeInTheDocument();
    expect(screen.getByText('Intermediate (B1)')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText(/quick practice/i)).toBeInTheDocument();
  });

  it('shows a graceful empty state for a new user with no activity', () => {
    useProgressMock.mockReturnValue({
      data: {
        ...POPULATED,
        totalSessions: 0,
        totalMinutes: 0,
        minutesToday: 0,
        weeklyMinutes: 0,
        currentStreak: 0,
        coursesEnrolled: 0,
      },
      isLoading: false,
    });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/haven't practiced yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start practicing/i })).toBeInTheDocument();
  });
});
