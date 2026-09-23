import type {
  CreateFlashcardDeckInput,
  FlashcardDeckDetailDTO,
  FlashcardDeckSummaryDTO,
  FlashcardResult,
  FlashcardReviewQueueDTO,
  FlashcardReviewStateDTO,
  GenerateFlashcardDeckInput,
} from '@vaani/types';
import { api } from '@/lib/api';

export const flashcardsApi = {
  listDecks: () => api.get<{ decks: FlashcardDeckSummaryDTO[] }>('/api/flashcards/decks'),
  deck: (deckId: string) =>
    api.get<{ deck: FlashcardDeckDetailDTO }>(`/api/flashcards/decks/${deckId}`),
  reviewQueue: (deckId?: string) =>
    api.get<{ queue: FlashcardReviewQueueDTO }>(
      deckId ? `/api/flashcards/review?deckId=${encodeURIComponent(deckId)}` : '/api/flashcards/review',
    ),
  submitReview: (flashcardId: string, result: FlashcardResult) =>
    api.post<{ state: FlashcardReviewStateDTO }>('/api/flashcards/review', { flashcardId, result }),
  createDeck: (input: CreateFlashcardDeckInput) =>
    api.post<{ deck: FlashcardDeckDetailDTO }>('/api/flashcards/decks', input),
  generateDeck: (input: GenerateFlashcardDeckInput) =>
    api.post<{ deck: FlashcardDeckDetailDTO }>('/api/flashcards/decks/generate', input),
};
