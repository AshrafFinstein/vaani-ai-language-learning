import { z } from 'zod';
import { LearningLevel } from './common.js';

export interface SentencePrompt {
  key: string;
  prompt: string;
  hint?: string;
}

/** Open-ended prompts for Sentence Mode — the learner responds in a full sentence. */
export const SENTENCE_PROMPTS: SentencePrompt[] = [
  { key: 'weekend', prompt: 'Tell me about your weekend.', hint: 'Use the past tense.' },
  { key: 'hobby', prompt: 'Describe a hobby you enjoy and why.', hint: 'Give a reason with "because".' },
  { key: 'city', prompt: 'Describe the city or town where you live.' },
  { key: 'food', prompt: 'What is your favorite food, and how is it made?' },
  { key: 'future', prompt: 'What do you want to do next year?', hint: 'Try "going to" or "will".' },
  { key: 'friend', prompt: 'Describe a good friend of yours.' },
  { key: 'job', prompt: 'Explain what you do (or study) on a typical day.' },
  { key: 'travel', prompt: 'Talk about a place you would like to visit.' },
];

export const SubmitSentenceInput = z.object({
  prompt: z.string().min(1).max(500),
  answer: z.string().min(1, 'Write a sentence first').max(1000),
  level: LearningLevel.optional(),
  languageCode: z.string().min(2).max(10).optional(),
});
export type SubmitSentenceInput = z.infer<typeof SubmitSentenceInput>;

const score = z.number().min(0).max(100);

/** Structured evaluation of a single learner sentence. Always Zod-validated from AI output. */
export const SentenceEvaluationSchema = z.object({
  corrected: z.string(),
  betterVersion: z.string(),
  explanation: z.string(),
  isCorrect: z.boolean().default(false),
  grammar_score: score.default(0),
  naturalness_score: score.default(0),
  overall_score: score.default(0),
});
export type SentenceEvaluation = z.infer<typeof SentenceEvaluationSchema>;
