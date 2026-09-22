import { z } from 'zod';
import { LearningLevel } from './common.js';

/**
 * Debate mode (Advanced AI Modes, master plan §16). The learner picks a topic and a
 * side; the AI argues the opposing side across turns, then produces structured,
 * schema-validated feedback (argument quality, persuasiveness, …). All topics are
 * original Vaani AI content.
 */

/** Which side of the motion the learner argues. The AI always takes the other. */
export const DebateSide = z.enum(['FOR', 'AGAINST']);
export type DebateSide = z.infer<typeof DebateSide>;

export const DebateStatus = z.enum(['ACTIVE', 'CLOSED']);
export type DebateStatus = z.infer<typeof DebateStatus>;

/** Debate messages reuse the shared USER/ASSISTANT role enum from chat.ts. */
const DebateMessageRole = z.enum(['USER', 'ASSISTANT']);

/** A predefined debate topic (motion). */
export interface DebateTopic {
  key: string;
  /** The motion, phrased as a statement (learner argues FOR or AGAINST it). */
  motion: string;
  description: string;
  category: string;
}

/** Static debate topics. Kept as authored product content (see scenario.ts rationale). */
export const DEBATE_TOPICS: DebateTopic[] = [
  {
    key: 'remote_work',
    motion: 'Remote work is better than working in an office.',
    description: 'Weigh flexibility and focus against collaboration and culture.',
    category: 'Work',
  },
  {
    key: 'social_media',
    motion: 'Social media does more harm than good.',
    description: 'Debate connection and reach versus wellbeing and misinformation.',
    category: 'Society',
  },
  {
    key: 'homework',
    motion: 'Schools should abolish homework.',
    description: 'Argue about reinforcement and discipline versus stress and free time.',
    category: 'Education',
  },
  {
    key: 'space_exploration',
    motion: 'Governments should spend more on space exploration.',
    description: 'Balance discovery and inspiration against pressing needs on Earth.',
    category: 'Science',
  },
  {
    key: 'four_day_week',
    motion: 'Companies should adopt a four-day work week.',
    description: 'Debate productivity and wellbeing against output and cost.',
    category: 'Work',
  },
  {
    key: 'ai_creativity',
    motion: 'AI will never be truly creative.',
    description: 'Argue the limits of machines versus the nature of human creativity.',
    category: 'Technology',
  },
];

export function findDebateTopic(key: string): DebateTopic | undefined {
  return DEBATE_TOPICS.find((t) => t.key === key);
}

export const DebateMessageDTO = z.object({
  id: z.string(),
  role: DebateMessageRole,
  content: z.string(),
  createdAt: z.string(),
});
export type DebateMessageDTO = z.infer<typeof DebateMessageDTO>;

export const DebateDTO = z.object({
  id: z.string(),
  topicKey: z.string(),
  motion: z.string(),
  /** The side the LEARNER argues; the AI argues the opposite. */
  userSide: DebateSide,
  level: LearningLevel,
  languageCode: z.string(),
  status: DebateStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DebateDTO = z.infer<typeof DebateDTO>;

export const DebateDetailDTO = DebateDTO.extend({
  messages: z.array(DebateMessageDTO),
});
export type DebateDetailDTO = z.infer<typeof DebateDetailDTO>;

export const DebateSummaryDTO = DebateDTO.extend({
  messageCount: z.number().int(),
});
export type DebateSummaryDTO = z.infer<typeof DebateSummaryDTO>;

export const StartDebateInput = z.object({
  topicKey: z.string().min(1, 'Choose a topic'),
  side: DebateSide,
  level: LearningLevel,
  languageCode: z.string().min(2).max(10).optional(),
});
export type StartDebateInput = z.infer<typeof StartDebateInput>;

export const DebateTurnInput = z.object({
  content: z.string().min(1, 'Make your argument').max(2000),
});
export type DebateTurnInput = z.infer<typeof DebateTurnInput>;

const score = z.number().min(0).max(100);

/**
 * Structured debate scoring (Advanced AI Modes). Produced by the `@vaani/ai` feedback
 * abstraction and ALWAYS validated against this schema before it is trusted or persisted.
 */
export const DebateFeedbackSchema = z.object({
  summary: z.string(),
  /** What the learner argued well. */
  strengths: z.array(z.string()).default([]),
  /** Where the learner's argument could improve. */
  improvements: z.array(z.string()).default([]),
  argument_quality_score: score.default(0),
  persuasiveness_score: score.default(0),
  overall_score: score.default(0),
});
export type DebateFeedback = z.infer<typeof DebateFeedbackSchema>;
