import {
  type CreateFlashcardDeckInput,
  type FlashcardDeckDetailDTO,
  type FlashcardDeckSummaryDTO,
  type FlashcardDTO,
  type FlashcardResult,
  type FlashcardReviewCardDTO,
  type FlashcardReviewQueueDTO,
  type FlashcardReviewStateDTO,
  type GenerateFlashcardDeckInput,
} from '@vaani/types';
import type { ChatOptions } from '@vaani/ai';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import { getAIProvider } from '../../lib/ai.js';
import { recordActivity } from '../../lib/activity.js';

type DeckRow = {
  id: string;
  title: string;
  description: string;
  languageCode: string;
  userId: string | null;
  isSystem: boolean;
};

type CardRow = {
  id: string;
  deckId: string;
  term: string;
  translation: string;
  example: string | null;
  ordinal: number;
};

type ReviewRow = {
  flashcardId: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
  lastResult: FlashcardResult | null;
};

/** One day in milliseconds — the unit the simple scheduler works in. */
const DAY_MS = 24 * 60 * 60 * 1000;

function toCardDTO(c: CardRow): FlashcardDTO {
  return {
    id: c.id,
    term: c.term,
    translation: c.translation,
    example: c.example,
    ordinal: c.ordinal,
  };
}

async function languageName(code: string): Promise<string | undefined> {
  const language = await prisma.language.findFirst({ where: { code } });
  return language?.name;
}

/**
 * SM-2-inspired scheduler. Given the prior state and the learner's self-grade, returns the
 * next {ease, intervalDays, repetitions, dueAt}. Pure and deterministic given `now`, which
 * is injected so callers (and tests) control the clock rather than reading it implicitly.
 */
export function schedule(
  prior: { ease: number; intervalDays: number; repetitions: number },
  result: FlashcardResult,
  now: Date,
): { ease: number; intervalDays: number; repetitions: number; dueAt: Date } {
  let { ease, repetitions } = prior;
  let intervalDays: number;

  if (result === 'AGAIN') {
    // Lapse: reset progress, lower ease, and show the card again the same day.
    repetitions = 0;
    ease = Math.max(1.3, ease - 0.2);
    intervalDays = 0;
  } else {
    repetitions += 1;
    if (result === 'EASY') ease = Math.min(3.0, ease + 0.15);
    if (repetitions === 1) intervalDays = result === 'EASY' ? 3 : 1;
    else if (repetitions === 2) intervalDays = result === 'EASY' ? 6 : 4;
    else intervalDays = Math.round(prior.intervalDays * ease) || 1;
  }

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS);
  return { ease, intervalDays, repetitions, dueAt };
}

export const flashcardService = {
  /** Decks visible to the learner: shared system decks + the learner's own decks. */
  async listDecks(userId: string, now: Date = new Date()): Promise<FlashcardDeckSummaryDTO[]> {
    const decks = (await prisma.flashcardDeck.findMany({
      where: { OR: [{ isSystem: true }, { userId }] },
      orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { cards: { select: { id: true } } },
    })) as Array<DeckRow & { cards: Array<{ id: string }> }>;

    const cardIds = decks.flatMap((d) => d.cards.map((c) => c.id));
    const dueByCard = await this.dueCardIds(userId, cardIds, now);

    return decks.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      languageCode: d.languageCode,
      isSystem: d.isSystem,
      isOwner: d.userId === userId,
      cardCount: d.cards.length,
      dueCount: d.cards.filter((c) => dueByCard.has(c.id)).length,
    }));
  },

  /** Full deck detail with ordered cards. 404s if the deck isn't visible to the learner. */
  async getDeck(userId: string, deckId: string, now: Date = new Date()): Promise<FlashcardDeckDetailDTO> {
    const deck = (await prisma.flashcardDeck.findFirst({
      where: { id: deckId, OR: [{ isSystem: true }, { userId }] },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
    })) as (DeckRow & { cards: CardRow[] }) | null;
    if (!deck) throw ApiException.notFound('Deck not found');

    const dueByCard = await this.dueCardIds(userId, deck.cards.map((c) => c.id), now);

    return {
      id: deck.id,
      title: deck.title,
      description: deck.description,
      languageCode: deck.languageCode,
      isSystem: deck.isSystem,
      isOwner: deck.userId === userId,
      cardCount: deck.cards.length,
      dueCount: deck.cards.filter((c) => dueByCard.has(c.id)).length,
      cards: deck.cards.map(toCardDTO),
    };
  },

  /**
   * The review queue for a deck (or all visible decks when `deckId` is omitted). A card is
   * "due" when it has no review row yet (never studied) or its `dueAt` has passed.
   */
  async getReviewQueue(
    userId: string,
    deckId: string | undefined,
    now: Date = new Date(),
  ): Promise<FlashcardReviewQueueDTO> {
    const cards = (await prisma.flashcard.findMany({
      where: {
        deck: deckId
          ? { id: deckId, OR: [{ isSystem: true }, { userId }] }
          : { OR: [{ isSystem: true }, { userId }] },
      },
      orderBy: [{ deckId: 'asc' }, { ordinal: 'asc' }],
    })) as CardRow[];

    if (deckId && cards.length === 0) {
      // Distinguish an empty/hidden deck from a deck that simply has no due cards.
      const deck = await prisma.flashcardDeck.findFirst({
        where: { id: deckId, OR: [{ isSystem: true }, { userId }] },
        select: { id: true },
      });
      if (!deck) throw ApiException.notFound('Deck not found');
    }

    const reviews = (await prisma.flashcardReview.findMany({
      where: { userId, flashcardId: { in: cards.map((c) => c.id) } },
    })) as ReviewRow[];
    const reviewByCard = new Map(reviews.map((r) => [r.flashcardId, r]));

    const dueCards: FlashcardReviewCardDTO[] = cards
      .filter((c) => {
        const r = reviewByCard.get(c.id);
        return !r || r.dueAt.getTime() <= now.getTime();
      })
      .map((c) => {
        const r = reviewByCard.get(c.id);
        return {
          ...toCardDTO(c),
          deckId: c.deckId,
          dueAt: r ? r.dueAt.toISOString() : null,
          intervalDays: r?.intervalDays ?? 0,
          repetitions: r?.repetitions ?? 0,
        };
      });

    return { cards: dueCards, dueCount: dueCards.length, totalCount: cards.length };
  },

  /** Grades one card and advances its spaced-repetition state (idempotent upsert). */
  async submitReview(
    userId: string,
    flashcardId: string,
    result: FlashcardResult,
    now: Date = new Date(),
  ): Promise<FlashcardReviewStateDTO> {
    const card = (await prisma.flashcard.findFirst({
      where: { id: flashcardId, deck: { OR: [{ isSystem: true }, { userId }] } },
      select: { id: true },
    })) as { id: string } | null;
    if (!card) throw ApiException.notFound('Flashcard not found');

    const existing = (await prisma.flashcardReview.findUnique({
      where: { userId_flashcardId: { userId, flashcardId } },
    })) as ReviewRow | null;

    const prior = {
      ease: existing?.ease ?? 2.5,
      intervalDays: existing?.intervalDays ?? 0,
      repetitions: existing?.repetitions ?? 0,
    };
    const next = schedule(prior, result, now);

    const saved = (await prisma.flashcardReview.upsert({
      where: { userId_flashcardId: { userId, flashcardId } },
      update: {
        ease: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        dueAt: next.dueAt,
        lastResult: result,
        lastReviewedAt: now,
      },
      create: {
        userId,
        flashcardId,
        ease: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        dueAt: next.dueAt,
        lastResult: result,
        lastReviewedAt: now,
      },
    })) as ReviewRow;

    // Record the practice activity for future progress analytics.
    await prisma.practiceSession.create({ data: { userId, kind: 'WORD' } });
    await recordActivity(userId, 'FLASHCARD', now);

    return {
      flashcardId,
      ease: saved.ease,
      intervalDays: saved.intervalDays,
      repetitions: saved.repetitions,
      dueAt: saved.dueAt.toISOString(),
      lastResult: result,
    };
  },

  /** Creates a user-owned deck from supplied cards (no AI). */
  async createDeck(userId: string, input: CreateFlashcardDeckInput): Promise<FlashcardDeckDetailDTO> {
    const deck = (await prisma.flashcardDeck.create({
      data: {
        title: input.title,
        description: input.description ?? '',
        languageCode: input.languageCode,
        userId,
        isSystem: false,
        cards: {
          create: input.cards.map((c, i) => ({
            term: c.term,
            translation: c.translation,
            example: c.example ?? null,
            ordinal: i,
          })),
        },
      },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
    })) as DeckRow & { cards: CardRow[] };

    return this.deckToDetail(userId, deck);
  },

  /**
   * Generates a deck for a topic via the `@vaani/ai` abstraction, then persists it as a
   * user-owned deck. The provider output is schema-validated inside the provider itself.
   */
  async generateDeck(userId: string, input: GenerateFlashcardDeckInput): Promise<FlashcardDeckDetailDTO> {
    let languageCode = input.languageCode;
    let level = input.level;
    if (!languageCode || !level) {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      languageCode = languageCode ?? profile?.learningLanguageCode ?? 'en';
      level = level ?? profile?.level ?? undefined;
    }
    const name = await languageName(languageCode);
    const options: ChatOptions & { count?: number } = {
      level,
      languageCode,
      languageName: name,
      count: input.count,
    };

    const generated = await getAIProvider().generateFlashcards(input.topic, options);

    const deck = (await prisma.flashcardDeck.create({
      data: {
        title: generated.title,
        description: generated.description,
        languageCode,
        userId,
        isSystem: false,
        cards: {
          create: generated.cards.map((c, i) => ({
            term: c.term,
            translation: c.translation,
            example: c.example ?? null,
            ordinal: i,
          })),
        },
      },
      include: { cards: { orderBy: { ordinal: 'asc' } } },
    })) as DeckRow & { cards: CardRow[] };

    return this.deckToDetail(userId, deck);
  },

  /** Set of card ids that are currently due for this learner (unstudied cards count as due). */
  async dueCardIds(userId: string, cardIds: string[], now: Date): Promise<Set<string>> {
    if (cardIds.length === 0) return new Set();
    const reviews = (await prisma.flashcardReview.findMany({
      where: { userId, flashcardId: { in: cardIds } },
      select: { flashcardId: true, dueAt: true },
    })) as Array<{ flashcardId: string; dueAt: Date }>;
    const notDue = new Set(reviews.filter((r) => r.dueAt.getTime() > now.getTime()).map((r) => r.flashcardId));
    return new Set(cardIds.filter((id) => !notDue.has(id)));
  },

  /** Maps a freshly-created deck row (owned by the learner) to its detail DTO. */
  deckToDetail(userId: string, deck: DeckRow & { cards: CardRow[] }): FlashcardDeckDetailDTO {
    return {
      id: deck.id,
      title: deck.title,
      description: deck.description,
      languageCode: deck.languageCode,
      isSystem: deck.isSystem,
      isOwner: deck.userId === userId,
      cardCount: deck.cards.length,
      dueCount: deck.cards.length, // brand-new cards are all due
      cards: deck.cards.map(toCardDTO),
    };
  },
};
