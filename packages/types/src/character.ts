import { z } from 'zod';
import { LearningLevel } from './common.js';

/**
 * Character conversations (Advanced AI Modes, master plan §16). Learners pick a
 * predefined AI persona (a barista, an interviewer, a travel guide, …) and chat with
 * it; the persona drives the AI's system prompt. Characters are seeded into the
 * `AICharacter` table (see prisma/seed.ts); these Zod DTOs are the shared contract.
 * All personas are original Vaani AI content.
 */

/** A persona the learner can converse with. */
export const CharacterDTO = z.object({
  id: z.string(),
  /** Stable slug used to look a character up (e.g. "barista"). */
  key: z.string(),
  name: z.string(),
  /** One-line tagline shown on the picker card. */
  tagline: z.string(),
  description: z.string(),
  /** Short scene/setting the character inhabits. */
  setting: z.string(),
  /** Emoji shown as the character's avatar. */
  avatarEmoji: z.string(),
  /** The persona's opening line (in-character) that seeds the conversation. */
  greeting: z.string(),
  /**
   * The persona instructions injected into the AI system prompt. Never rendered to
   * the learner directly — it shapes how the AI stays in character.
   */
  persona: z.string(),
});
export type CharacterDTO = z.infer<typeof CharacterDTO>;

/** Start a conversation with a character. */
export const StartCharacterChatInput = z.object({
  characterKey: z.string().min(1, 'Choose a character'),
  level: LearningLevel,
  /** Optional — defaults to the user's current learning language when omitted. */
  languageCode: z.string().min(2).max(10).optional(),
});
export type StartCharacterChatInput = z.infer<typeof StartCharacterChatInput>;
