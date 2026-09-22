import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StartScreen } from '@/features/chat/components/StartScreen';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from './test-utils';

describe('Chat StartScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        name: 'Alex',
        email: 'a@b.com',
        avatarUrl: null,
        role: 'USER',
        learningLanguageCode: 'es',
        level: 'INTERMEDIATE',
        createdAt: new Date().toISOString(),
      } as never,
      isHydrating: false,
    });
  });

  it('renders topics and starts with the selected level', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    renderWithProviders(<StartScreen onStart={onStart} />);

    expect(screen.getByText('Daily conversation')).toBeInTheDocument();
    expect(screen.getByText('Job interview')).toBeInTheDocument();

    await user.click(screen.getByText('Daily conversation'));
    // Defaults to the user's level (INTERMEDIATE) unless changed.
    expect(onStart).toHaveBeenCalledWith('DAILY', 'INTERMEDIATE');
  });

  it('lets the learner change level before starting', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    renderWithProviders(<StartScreen onStart={onStart} />);

    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.click(screen.getByText('Travel'));
    expect(onStart).toHaveBeenCalledWith('TRAVEL', 'ADVANCED');
  });
});
