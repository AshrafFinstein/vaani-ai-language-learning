import { z } from 'zod';

/**
 * Structured AI tutor feedback (spec §15). Raw model output is ALWAYS validated
 * against this schema before it is trusted or persisted — never used directly.
 */
export const CorrectionSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  explanation: z.string(),
});
export type Correction = z.infer<typeof CorrectionSchema>;

export const VocabularySuggestionSchema = z.object({
  term: z.string(),
  meaning: z.string(),
  example: z.string().optional(),
});
export type VocabularySuggestion = z.infer<typeof VocabularySuggestionSchema>;

export const PronunciationNoteSchema = z.object({
  word: z.string(),
  tip: z.string(),
});
export type PronunciationNote = z.infer<typeof PronunciationNoteSchema>;

const score = z.number().min(0).max(100);

export const AIFeedbackSchema = z.object({
  reply: z.string(),
  corrections: z.array(CorrectionSchema).default([]),
  vocabulary: z.array(VocabularySuggestionSchema).default([]),
  pronunciation: z.array(PronunciationNoteSchema).default([]),
  grammar_score: score.default(0),
  fluency_score: score.default(0),
  overall_score: score.default(0),
});
export type AIFeedback = z.infer<typeof AIFeedbackSchema>;
