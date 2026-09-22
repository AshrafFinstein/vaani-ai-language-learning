import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEBATE_TOPICS } from '@vaani/types';
import { DebatePicker } from '@/features/debate/DebatePicker';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from './test-utils';

describe('DebatePicker', () => {
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

  it('requires a topic before the start button works', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    renderWithProviders(<DebatePicker onStart={onStart} />);

    // No topic chosen yet — start is disabled.
    const startBtn = screen.getByRole('button', { name: /start debate/i });
    expect(startBtn).toBeDisabled();

    await user.click(screen.getByText(DEBATE_TOPICS[0]!.motion));
    expect(startBtn).toBeEnabled();
  });

  it('starts with the chosen topic, side, and level', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    renderWithProviders(<DebatePicker onStart={onStart} />);

    await user.click(screen.getByRole('button', { name: 'Argue against' }));
    await user.click(screen.getByText(DEBATE_TOPICS[1]!.motion));
    await user.click(screen.getByRole('button', { name: /start debate/i }));

    expect(onStart).toHaveBeenCalledWith(DEBATE_TOPICS[1]!.key, 'AGAINST', 'INTERMEDIATE');
  });
});
