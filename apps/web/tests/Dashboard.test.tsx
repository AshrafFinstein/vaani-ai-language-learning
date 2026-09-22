import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from '@/pages/app/Dashboard';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from './test-utils';

// Avoid a real network call for the languages query.
vi.mock('@/features/language/useLanguages', () => ({
  useLanguages: () => ({
    data: [{ code: 'es', name: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', rtl: false }],
  }),
}));

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
  });

  it('greets the user by first name', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /alex/i })).toBeInTheDocument();
  });

  it('renders skill and stat sections from dashboard data', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Current level')).toBeInTheDocument();
    // 'Listening' is unique to the skills list ('Speaking' also appears in the badge).
    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getByText(/quick practice/i)).toBeInTheDocument();
  });
});
