import { z } from 'zod';
import { LearningLevel } from './common.js';

/**
 * Flashcards — vocabulary decks studied with a simple spaced-repetition review flow.
 * Distinct from Word mode: a deck groups cards (term/translation/example), and each
 * learner has per-card review state (ease, interval, due date). Decks are either shared
 * *system* decks (seeded) or *user-owned* decks (including AI-generated ones). These Zod
 * schemas are the single source of truth for the flashcard request/response shapes.
 */

/** The learner's self-graded result for one review, driving the scheduler. */
export const FlashcardResult = z.enum(['AGAIN', 'GOOD', 'EASY']);
export type FlashcardResult = z.infer<typeof FlashcardResult>;

/** A single card within a deck. */
export const FlashcardDTO = z.object({
  id: z.string(),
  term: z.string(),
  translation: z.string(),
  example: z.string().nullable(),
  ordinal: z.number().int(),
});
export type FlashcardDTO = z.infer<typeof FlashcardDTO>;

/** A deck summary as shown in the decks list. `dueCount` reflects the current learner. */
export const FlashcardDeckSummaryDTO = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  languageCode: z.string(),
  /** True for shared/seeded decks; false for the learner's own decks. */
  isSystem: z.boolean(),
  /** True when the deck belongs to the current learner (AI-generated or manual). */
  isOwner: z.boolean(),
  cardCount: z.number().int(),
  /** Number of cards currently due for review for the current learner. */
  dueCount: z.number().int(),
});
export type FlashcardDeckSummaryDTO = z.infer<typeof FlashcardDeckSummaryDTO>;

/** Full deck detail: metadata plus its ordered cards. */
export const FlashcardDeckDetailDTO = FlashcardDeckSummaryDTO.extend({
  cards: z.array(FlashcardDTO),
});
export type FlashcardDeckDetailDTO = z.infer<typeof FlashcardDeckDetailDTO>;

/** A card enriched with the learner's review state — returned by the review queue. */
export const FlashcardReviewCardDTO = FlashcardDTO.extend({
  deckId: z.string(),
  /** null when the card has never been reviewed by this learner. */
  dueAt: z.string().nullable(),
  intervalDays: z.number().int(),
  repetitions: z.number().int(),
});
export type FlashcardReviewCardDTO = z.infer<typeof FlashcardReviewCardDTO>;

/** The review queue for a deck (or all decks) plus a small progress summary. */
export const FlashcardReviewQueueDTO = z.object({
  cards: z.array(FlashcardReviewCardDTO),
  dueCount: z.number().int(),
  totalCount: z.number().int(),
});
export type FlashcardReviewQueueDTO = z.infer<typeof FlashcardReviewQueueDTO>;

/** Create a deck manually (no AI) from supplied cards. */
export const CreateFlashcardDeckInput = z.object({
  title: z.string().min(1, 'Give the deck a title').max(120),
  description: z.string().max(500).optional(),
  languageCode: z.string().min(2).max(10),
  cards: z
    .array(
      z.object({
        term: z.string().min(1).max(200),
        translation: z.string().min(1).max(200),
        example: z.string().max(400).optional(),
      }),
    )
    .min(1, 'Add at least one card')
    .max(100),
});
export type CreateFlashcardDeckInput = z.infer<typeof CreateFlashcardDeckInput>;

/** Generate a deck for a topic via the `@vaani/ai` abstraction. */
export const GenerateFlashcardDeckInput = z.object({
  topic: z.string().min(1, 'Enter a topic').max(120),
  languageCode: z.string().min(2).max(10).optional(),
  level: LearningLevel.optional(),
  /** How many cards to generate (the provider clamps this to a safe range). */
  count: z.number().int().min(1).max(30).optional(),
});
export type GenerateFlashcardDeckInput = z.infer<typeof GenerateFlashcardDeckInput>;

/** Submit one review result; the service advances the spaced-repetition state. */
export const SubmitFlashcardReviewInput = z.object({
  flashcardId: z.string().min(1),
  result: FlashcardResult,
});
export type SubmitFlashcardReviewInput = z.infer<typeof SubmitFlashcardReviewInput>;

/** The updated review state returned after grading a card. */
export const FlashcardReviewStateDTO = z.object({
  flashcardId: z.string(),
  ease: z.number(),
  intervalDays: z.number().int(),
  repetitions: z.number().int(),
  dueAt: z.string(),
  lastResult: FlashcardResult,
});
export type FlashcardReviewStateDTO = z.infer<typeof FlashcardReviewStateDTO>;

/**
 * One AI-generated flashcard candidate. Produced by the `@vaani/ai` abstraction from a
 * topic and ALWAYS validated against this schema before it is persisted. `example` is
 * optional so terse generations never fail validation.
 */
export const GeneratedFlashcardSchema = z.object({
  term: z.string().min(1),
  translation: z.string().min(1),
  example: z.string().optional(),
});
export type GeneratedFlashcard = z.infer<typeof GeneratedFlashcardSchema>;

/** A generated deck: a title plus its cards. Validated on return from the provider. */
export const GeneratedFlashcardDeckSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  cards: z.array(GeneratedFlashcardSchema).default([]),
});
export type GeneratedFlashcardDeck = z.infer<typeof GeneratedFlashcardDeckSchema>;
