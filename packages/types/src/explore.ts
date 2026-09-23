import { z } from 'zod';

/**
 * Explore — a daily discovery payload surfacing curated picks across the EXISTING modes
 * (roleplay scenarios, characters, courses, flashcard decks). The selection is
 * deterministic (seeded by the request date / a stable rotation) so the same day always
 * yields the same picks and tests stay reproducible. This Zod schema is the single source
 * of truth for the explore response shape. No underlying content is duplicated here — each
 * pick references its source item by key/slug and links into the relevant mode route.
 */

/** The kinds of content Explore can surface, each mapping to an existing mode route. */
export const ExplorePickKind = z.enum(['ROLEPLAY', 'CHARACTER', 'COURSE', 'FLASHCARD_DECK']);
export type ExplorePickKind = z.infer<typeof ExplorePickKind>;

/**
 * A single curated pick. `to` is the in-app route the card links to; `refKey` is the
 * stable identifier (scenario key / character key / course slug / deck id) of the source.
 */
export const ExplorePickDTO = z.object({
  kind: ExplorePickKind,
  refKey: z.string(),
  title: z.string(),
  subtitle: z.string(),
  /** Emoji shown on the card. */
  emoji: z.string(),
  /** In-app route this pick links to (e.g. "/app/roleplay/restaurant"). */
  to: z.string(),
});
export type ExplorePickDTO = z.infer<typeof ExplorePickDTO>;

/** A titled group of picks (e.g. "Today's scenarios"). */
export const ExploreSectionDTO = z.object({
  key: z.string(),
  title: z.string(),
  picks: z.array(ExplorePickDTO),
});
export type ExploreSectionDTO = z.infer<typeof ExploreSectionDTO>;

/** The full daily Explore payload: a highlighted hero pick plus grouped sections. */
export const ExplorePayloadDTO = z.object({
  /** The date this payload was generated for (YYYY-MM-DD), echoed back for clarity. */
  date: z.string(),
  /** A short, encouraging line introducing today's picks. */
  intro: z.string(),
  /** The single highlighted pick for the day. */
  highlight: ExplorePickDTO,
  sections: z.array(ExploreSectionDTO),
});
export type ExplorePayloadDTO = z.infer<typeof ExplorePayloadDTO>;

/** Query for the explore endpoint. `date` (YYYY-MM-DD) makes the picks deterministic. */
export const ExploreQueryInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
});
export type ExploreQueryInput = z.infer<typeof ExploreQueryInput>;
