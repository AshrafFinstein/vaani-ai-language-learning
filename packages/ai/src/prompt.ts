import type { ChatOptions } from './types.js';

const LEVEL_GUIDANCE: Record<string, string> = {
  BEGINNER:
    'The learner is a beginner (A1). Use very simple, short sentences and common words. Speak slowly and clearly. Avoid idioms and complex grammar.',
  ELEMENTARY:
    'The learner is elementary (A2). Use simple sentences and everyday vocabulary. Introduce a little variety but keep it easy to follow.',
  INTERMEDIATE:
    'The learner is intermediate (B1). Use natural but clear language. You can use common idioms and a moderate range of vocabulary.',
  UPPER_INTERMEDIATE:
    'The learner is upper-intermediate (B2). Speak naturally with richer vocabulary and varied sentence structures.',
  ADVANCED:
    'The learner is advanced (C1+). Speak naturally and fluently, using nuanced vocabulary and idiomatic expressions.',
};

/**
 * Builds the tutor system prompt. The AI stays in the target language, adapts to the
 * learner's level, keeps replies short and conversational, and — importantly — does NOT
 * correct the learner inline. Corrections are surfaced separately via {@link buildFeedbackPrompt}.
 */
export function buildSystemPrompt(options?: ChatOptions): string {
  const language = options?.languageName ?? 'the target language';
  const level = options?.level ? LEVEL_GUIDANCE[options.level] : '';
  const topic = options?.topic ? `The conversation topic is "${options.topic}".` : '';

  return [
    `You are Vaani, a warm, encouraging language tutor helping someone practice ${language}.`,
    level,
    topic,
    `Guidelines:`,
    `- Reply ONLY in ${language} (unless the learner clearly needs a quick clarification).`,
    `- Keep replies short (1-3 sentences) and conversational.`,
    `- Do NOT correct the learner's mistakes inline; keep the conversation flowing naturally.`,
    `- End most replies with a friendly follow-up question to keep them talking.`,
    `- Be patient, positive, and never condescending.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Builds the system prompt for structured feedback. Instructs the model to return ONLY
 * JSON matching the AIFeedback schema. Output is still validated with Zod on return.
 */
export function buildFeedbackPrompt(options?: ChatOptions): string {
  const language = options?.languageName ?? 'the target language';
  return [
    `You are a ${language} language tutor reviewing a learner's conversation.`,
    options?.level ? LEVEL_GUIDANCE[options.level] : '',
    `Analyze the learner's messages (role "user") and produce concise, constructive feedback.`,
    `Return ONLY a JSON object with EXACTLY these keys:`,
    `{`,
    `  "reply": string,                    // 1-2 sentence encouraging summary`,
    `  "corrections": [ { "original": string, "corrected": string, "explanation": string } ],`,
    `  "vocabulary": [ { "term": string, "meaning": string, "example": string } ],`,
    `  "pronunciation": [ { "word": string, "tip": string } ],`,
    `  "grammar_score": number,            // 0-100`,
    `  "fluency_score": number,            // 0-100`,
    `  "overall_score": number             // 0-100`,
    `}`,
    `Only include real corrections you actually observed. Use empty arrays when there is nothing to add.`,
    `Do not wrap the JSON in markdown fences or add any text outside the JSON.`,
  ]
    .filter(Boolean)
    .join('\n');
}
