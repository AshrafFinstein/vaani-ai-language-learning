import {
  ROLEPLAY_SCENARIOS,
  type ExplorePayloadDTO,
  type ExplorePickDTO,
  type ExploreSectionDTO,
} from '@vaani/types';
import { prisma } from '../../prisma.js';

/**
 * Explore builds a deterministic "daily picks" payload from EXISTING content — roleplay
 * scenarios (static, from @vaani/types), characters, courses, and flashcard decks (all from
 * the DB). Nothing is duplicated: each pick references its source by key/slug/id and links
 * into the relevant mode route. Selection is seeded by the request date (a stable rotation),
 * so the same day always yields the same picks — no Math.random / implicit clock reads.
 */

/** A tiny deterministic hash of a YYYY-MM-DD string → a non-negative integer seed. */
export function dateSeed(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  return hash;
}

/** Rotates `items` so a stable window is chosen for the given seed. Pure + deterministic. */
function rotate<T>(items: T[], seed: number): T[] {
  if (items.length === 0) return [];
  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function scenarioPick(seed: number): ExplorePickDTO[] {
  return rotate(ROLEPLAY_SCENARIOS, seed)
    .slice(0, 3)
    .map((s) => ({
      kind: 'ROLEPLAY' as const,
      refKey: s.key,
      title: s.title,
      subtitle: s.description,
      emoji: '🎭',
      to: `/app/roleplay/${s.key}`,
    }));
}

export const exploreService = {
  /** Builds the daily Explore payload for `date` (YYYY-MM-DD). Deterministic per date. */
  async getDailyPicks(date: string): Promise<ExplorePayloadDTO> {
    const seed = dateSeed(date);

    const [characters, courses, decks] = await Promise.all([
      prisma.aICharacter.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { key: true, name: true, tagline: true, avatarEmoji: true },
      }),
      prisma.course.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: { slug: true, title: true, description: true, coverEmoji: true },
      }),
      prisma.flashcardDeck.findMany({
        where: { isSystem: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, description: true },
      }),
    ]);

    const scenarioPicks = scenarioPick(seed);

    const characterPicks: ExplorePickDTO[] = rotate(characters, seed)
      .slice(0, 2)
      .map((c) => ({
        kind: 'CHARACTER' as const,
        refKey: c.key,
        title: c.name,
        subtitle: c.tagline,
        emoji: c.avatarEmoji,
        to: `/app/characters/${c.key}`,
      }));

    const coursePicks: ExplorePickDTO[] = rotate(courses, seed)
      .slice(0, 1)
      .map((c) => ({
        kind: 'COURSE' as const,
        refKey: c.slug,
        title: c.title,
        subtitle: c.description,
        emoji: c.coverEmoji,
        to: `/app/courses/${c.slug}`,
      }));

    const deckPicks: ExplorePickDTO[] = rotate(decks, seed)
      .slice(0, 1)
      .map((d) => ({
        kind: 'FLASHCARD_DECK' as const,
        refKey: d.id,
        title: d.title,
        subtitle: d.description || 'A vocabulary deck to review today.',
        emoji: '🃏',
        to: `/app/flashcards/${d.id}`,
      }));

    // The highlight rotates across the available pick pools by the same seed so it is stable
    // per day but varies day to day. Falls back gracefully when a pool is empty.
    const pools = [scenarioPicks, characterPicks, coursePicks, deckPicks].filter((p) => p.length);
    const highlight = pools.length
      ? pools[seed % pools.length]![0]!
      : scenarioPicks[0] ?? {
          kind: 'ROLEPLAY' as const,
          refKey: ROLEPLAY_SCENARIOS[0]!.key,
          title: ROLEPLAY_SCENARIOS[0]!.title,
          subtitle: ROLEPLAY_SCENARIOS[0]!.description,
          emoji: '🎭',
          to: `/app/roleplay/${ROLEPLAY_SCENARIOS[0]!.key}`,
        };

    const sections: ExploreSectionDTO[] = [
      { key: 'scenarios', title: "Today's scenarios", picks: scenarioPicks },
      { key: 'characters', title: 'Featured characters', picks: characterPicks },
      { key: 'courses', title: 'A course to try', picks: coursePicks },
      { key: 'decks', title: 'Vocabulary deck of the day', picks: deckPicks },
    ].filter((s) => s.picks.length > 0);

    return {
      date,
      intro: "Fresh picks to keep your streak going — here's what to explore today.",
      highlight,
      sections,
    };
  },
};
