import { useMutation, useQuery } from '@tanstack/react-query';
import type { FlashcardResult, GenerateFlashcardDeckInput } from '@vaani/types';
import { queryClient } from '@/lib/queryClient';
import { flashcardsApi } from './flashcards.api';

export function useFlashcardDecks() {
  return useQuery({
    queryKey: ['flashcards', 'decks'],
    queryFn: flashcardsApi.listDecks,
  });
}

export function useFlashcardReviewQueue(deckId: string | undefined) {
  return useQuery({
    queryKey: ['flashcards', 'review', deckId ?? 'all'],
    queryFn: () => flashcardsApi.reviewQueue(deckId),
  });
}

/** Invalidates the decks list and review queues after a review or deck change. */
function invalidateFlashcards() {
  void queryClient.invalidateQueries({ queryKey: ['flashcards', 'decks'] });
  void queryClient.invalidateQueries({ queryKey: ['flashcards', 'review'] });
}

export function useSubmitFlashcardReview() {
  return useMutation({
    mutationFn: ({ flashcardId, result }: { flashcardId: string; result: FlashcardResult }) =>
      flashcardsApi.submitReview(flashcardId, result),
    onSuccess: invalidateFlashcards,
  });
}

export function useGenerateFlashcardDeck() {
  return useMutation({
    mutationFn: (input: GenerateFlashcardDeckInput) => flashcardsApi.generateDeck(input),
    onSuccess: invalidateFlashcards,
  });
}
