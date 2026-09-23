import type { Request, Response } from 'express';
import type {
  CreateFlashcardDeckInput,
  GenerateFlashcardDeckInput,
  SubmitFlashcardReviewInput,
} from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { flashcardService } from './flashcard.service.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const flashcardController = {
  async listDecks(req: Request, res: Response): Promise<void> {
    const decks = await flashcardService.listDecks(userId(req));
    res.status(200).json({ data: { decks } });
  },

  async getDeck(req: Request, res: Response): Promise<void> {
    const deck = await flashcardService.getDeck(userId(req), req.params.deckId!);
    res.status(200).json({ data: { deck } });
  },

  async reviewQueue(req: Request, res: Response): Promise<void> {
    const deckId = typeof req.query.deckId === 'string' ? req.query.deckId : undefined;
    const queue = await flashcardService.getReviewQueue(userId(req), deckId);
    res.status(200).json({ data: { queue } });
  },

  async submitReview(req: Request, res: Response): Promise<void> {
    const { flashcardId, result } = req.body as SubmitFlashcardReviewInput;
    const state = await flashcardService.submitReview(userId(req), flashcardId, result);
    res.status(200).json({ data: { state } });
  },

  async createDeck(req: Request, res: Response): Promise<void> {
    const deck = await flashcardService.createDeck(userId(req), req.body as CreateFlashcardDeckInput);
    res.status(201).json({ data: { deck } });
  },

  async generateDeck(req: Request, res: Response): Promise<void> {
    const deck = await flashcardService.generateDeck(
      userId(req),
      req.body as GenerateFlashcardDeckInput,
    );
    res.status(201).json({ data: { deck } });
  },
};
