import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CharacterDTO } from '@vaani/types';
import { CharacterPicker } from '@/features/characters/CharacterPicker';
import { useAuthStore } from '@/stores/authStore';
import { renderWithProviders } from './test-utils';

const CHARACTERS: CharacterDTO[] = [
  {
    id: 'c1',
    key: 'barista',
    name: 'Mika the Barista',
    tagline: 'a cheerful barista',
    description: 'Order drinks and make small talk.',
    setting: 'a café',
    avatarEmoji: '☕',
    greeting: 'Hi!',
    persona: 'You are Mika.',
  },
  {
    id: 'c2',
    key: 'interviewer',
    name: 'Ms. Okafor',
    tagline: 'a job interviewer',
    description: 'Rehearse interview questions.',
    setting: 'an office',
    avatarEmoji: '💼',
    greeting: 'Tell me about yourself.',
    persona: 'You are Ms. Okafor.',
  },
];

describe('CharacterPicker', () => {
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

  it('renders characters and selects one with the default level', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(<CharacterPicker characters={CHARACTERS} onSelect={onSelect} />);

    expect(screen.getByText('Mika the Barista')).toBeInTheDocument();
    expect(screen.getByText('Ms. Okafor')).toBeInTheDocument();

    await user.click(screen.getByText('Mika the Barista'));
    expect(onSelect).toHaveBeenCalledWith('barista', 'INTERMEDIATE');
  });

  it('lets the learner change level before selecting', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(<CharacterPicker characters={CHARACTERS} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.click(screen.getByText('Ms. Okafor'));
    expect(onSelect).toHaveBeenCalledWith('interviewer', 'ADVANCED');
  });

  it('shows loading skeletons instead of cards', () => {
    renderWithProviders(<CharacterPicker characters={[]} isLoading onSelect={vi.fn()} />);
    expect(screen.queryByText('Mika the Barista')).not.toBeInTheDocument();
  });
});
