import type { SentenceEvaluation, SubmitSentenceInput } from '@vaani/types';
import { prisma } from '../../prisma.js';
import { getAIProvider } from '../../lib/ai.js';
import { recordActivity } from '../../lib/activity.js';

export const practiceService = {
  /** Evaluates a single learner sentence and records a practice session. */
  async evaluateSentence(userId: string, input: SubmitSentenceInput): Promise<SentenceEvaluation> {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const languageCode = input.languageCode ?? profile?.learningLanguageCode ?? undefined;
    const level = input.level ?? profile?.level;

    const language = languageCode
      ? await prisma.language.findFirst({ where: { code: languageCode, isActive: true } })
      : null;

    const evaluation = await getAIProvider().evaluateSentence(input.prompt, input.answer, {
      level: level ?? undefined,
      languageCode: languageCode ?? undefined,
      languageName: language?.name,
    });

    await prisma.practiceSession.create({ data: { userId, kind: 'SENTENCE' } });
    await recordActivity(userId, 'SENTENCE');
    return evaluation;
  },
};
