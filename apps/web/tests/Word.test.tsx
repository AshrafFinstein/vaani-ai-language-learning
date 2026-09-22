import { describe, expect, it, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordPage from '@/pages/app/Word';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from './test-utils';

describe('WordPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: {
        id: 'u1',
        name: 'Alex',
        email: 'a@b.com',
        avatarUrl: null,
        role: 'USER',
        learningLanguageCode: 'en',
        level: 'BEGINNER',
        createdAt: new Date().toISOString(),
      } as never,
      isHydrating: false,
    });
  });

  it('reveals a word meaning and advances progress on "I know this"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WordPage />);

    expect(screen.getByText('efficient')).toBeInTheDocument();
    expect(screen.getByText('0 / 5 words learned')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show meaning/i }));
    expect(screen.getByText(/working well without wasting time/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /i know this/i }));
    expect(screen.getByText('1 / 5 words learned')).toBeInTheDocument();
  });
});
