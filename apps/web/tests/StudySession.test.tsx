import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FlashcardReviewCardDTO } from '@vaani/types';
import { StudySession } from '@/features/flashcards/StudySession';
import { renderWithProviders } from './test-utils';

// Mock the review mutation so the study flow never hits the network.
const mutate = vi.fn();
vi.mock('@/features/flashcards/useFlashcards', () => ({
  useSubmitFlashcardReview: () => ({ mutate, isPending: false }),
}));

const CARDS: FlashcardReviewCardDTO[] = [
  {
    id: 'card_1',
    deckId: 'deck_1',
    term: 'el aeropuerto',
    translation: 'the airport',
    example: 'Voy al aeropuerto.',
    ordinal: 0,
    dueAt: null,
    intervalDays: 0,
    repetitions: 0,
  },
  {
    id: 'card_2',
    deckId: 'deck_1',
    term: 'el billete',
    translation: 'the ticket',
    example: null,
    ordinal: 1,
    dueAt: null,
    intervalDays: 0,
    repetitions: 0,
  },
];

describe('StudySession', () => {
  it('flips a card to reveal the back, then grades it and advances', async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    renderWithProviders(<StudySession cards={CARDS} />);

    // Front is shown; the back (translation) is hidden until flipped.
    expect(screen.getByTestId('card-front')).toHaveTextContent('el aeropuerto');
    expect(screen.queryByText('the airport')).not.toBeInTheDocument();
    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();

    // Flip to reveal the back.
    await user.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('the airport')).toBeInTheDocument();
    expect(screen.getByText('Voy al aeropuerto.')).toBeInTheDocument();

    // Grade "Good" → submits the review and advances to card 2.
    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(mutate).toHaveBeenCalledWith({ flashcardId: 'card_1', result: 'GOOD' });
    expect(screen.getByTestId('card-front')).toHaveTextContent('el billete');
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
  });

  it('shows a completion state after the last card is graded', async () => {
    const user = userEvent.setup();
    mutate.mockClear();
    renderWithProviders(<StudySession cards={[CARDS[0]!]} />);

    await user.click(screen.getByRole('button', { name: /show answer/i }));
    await user.click(screen.getByRole('button', { name: 'Easy' }));

    expect(mutate).toHaveBeenCalledWith({ flashcardId: 'card_1', result: 'EASY' });
    expect(screen.getByText(/review complete/i)).toBeInTheDocument();
  });

  it('renders an empty state when there is nothing to review', () => {
    renderWithProviders(<StudySession cards={[]} />);
    expect(screen.getByText(/nothing to review right now/i)).toBeInTheDocument();
  });
});
