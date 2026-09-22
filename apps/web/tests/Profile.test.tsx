import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/pages/app/Profile';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from './test-utils';

// Deterministic languages list (no network).
vi.mock('@/features/language/useLanguages', () => ({
  useLanguages: () => ({
    data: [
      { code: 'es', name: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', rtl: false },
      { code: 'fr', name: 'French', nativeName: 'Français', flagEmoji: '🇫🇷', rtl: false },
    ],
  }),
}));

const mutate = vi.fn();
vi.mock('@/features/user/useUpdateProfile', () => ({
  useUpdateProfile: () => ({ mutate, isPending: false }),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    mutate.mockReset();
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

  it('renders the form prefilled with the current profile', () => {
    renderWithProviders(<ProfilePage />);
    expect(screen.getByRole('heading', { name: /profile & settings/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Alex Rivera');
    expect(screen.getByLabelText(/learning language/i)).toHaveValue('es');
    expect(screen.getByLabelText(/daily goal/i)).toHaveValue(30);
  });

  it('submits updated values through the profile mutation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await user.selectOptions(screen.getByLabelText(/learning language/i), 'fr');
    const goal = screen.getByLabelText(/daily goal/i);
    await user.clear(goal);
    await user.type(goal, '45');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    const [payload] = mutate.mock.lastCall ?? [];
    expect(payload).toMatchObject({
      name: 'Alex Rivera',
      learningLanguageCode: 'fr',
      dailyGoalMinutes: 45,
    });
  });

  it('shows a validation error for an out-of-range daily goal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    const goal = screen.getByLabelText(/daily goal/i);
    await user.clear(goal);
    await user.type(goal, '1');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/greater than or equal to 5/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
