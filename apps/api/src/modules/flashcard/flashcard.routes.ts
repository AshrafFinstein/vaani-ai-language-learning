import { Router } from 'express';
import {
  CreateFlashcardDeckInput,
  GenerateFlashcardDeckInput,
  SubmitFlashcardReviewInput,
} from '@vaani/types';
import { flashcardController } from './flashcard.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const flashcardRouter = Router();

flashcardRouter.use(requireAuth);

flashcardRouter.get('/decks', asyncHandler(flashcardController.listDecks));
flashcardRouter.post(
  '/decks',
  validateBody(CreateFlashcardDeckInput),
  asyncHandler(flashcardController.createDeck),
);
flashcardRouter.post(
  '/decks/generate',
  validateBody(GenerateFlashcardDeckInput),
  asyncHandler(flashcardController.generateDeck),
);
flashcardRouter.get('/review', asyncHandler(flashcardController.reviewQueue));
flashcardRouter.post(
  '/review',
  validateBody(SubmitFlashcardReviewInput),
  asyncHandler(flashcardController.submitReview),
);
flashcardRouter.get('/decks/:deckId', asyncHandler(flashcardController.getDeck));
