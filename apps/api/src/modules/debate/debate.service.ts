import type { Prisma } from '@prisma/client';
import {
  findDebateTopic,
  type DebateDetailDTO,
  type DebateDTO,
  type DebateFeedback,
  type DebateMessageDTO,
  type DebateSummaryDTO,
  type StartDebateInput,
} from '@vaani/types';
import { buildDebatePrompt, type ChatMessage, type ChatOptions } from '@vaani/ai';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import { getAIProvider } from '../../lib/ai.js';
import { recordActivity } from '../../lib/activity.js';

type DebateWithMessages = Prisma.DebateGetPayload<{ include: { messages: true } }>;
type DebateMessage = Prisma.DebateMessageGetPayload<object>;

function toMessageDTO(m: DebateMessage): DebateMessageDTO {
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() };
}

function toDebateDTO(d: {
  id: string;
  topicKey: string;
  motion: string;
  userSide: DebateDTO['userSide'];
  level: DebateDTO['level'];
  languageCode: string;
  status: DebateDTO['status'];
  createdAt: Date;
  updatedAt: Date;
}): DebateDTO {
  return {
    id: d.id,
    topicKey: d.topicKey,
    motion: d.motion,
    userSide: d.userSide,
    level: d.level,
    languageCode: d.languageCode,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** Turns a stored debate into provider-ready messages + options with the debate system prompt. */
function buildContext(debate: DebateWithMessages, languageName?: string): {
  messages: ChatMessage[];
  options: ChatOptions;
} {
  const messages: ChatMessage[] = debate.messages.map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }));
  const options: ChatOptions = {
    level: debate.level,
    languageCode: debate.languageCode,
    languageName,
    systemPrompt: buildDebatePrompt(debate.motion, debate.userSide, {
      level: debate.level,
      languageName,
    }),
  };
  return { messages, options };
}

async function getOwnedDebate(userId: string, debateId: string): Promise<DebateWithMessages> {
  const debate = await prisma.debate.findFirst({
    where: { id: debateId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!debate) throw ApiException.notFound('Debate not found');
  return debate;
}

async function languageName(code: string): Promise<string | undefined> {
  const language = await prisma.language.findFirst({ where: { code } });
  return language?.name;
}

async function touch(debateId: string): Promise<void> {
  await prisma.debate.update({ where: { id: debateId }, data: { updatedAt: new Date() } });
}

export const debateService = {
  async listDebates(userId: string): Promise<DebateSummaryDTO[]> {
    const debates = await prisma.debate.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
    return debates.map((d) => ({ ...toDebateDTO(d), messageCount: d._count.messages }));
  },

  async getDebateDetail(userId: string, id: string): Promise<DebateDetailDTO> {
    const debate = await getOwnedDebate(userId, id);
    return { ...toDebateDTO(debate), messages: debate.messages.map(toMessageDTO) };
  },

  async startDebate(userId: string, input: StartDebateInput): Promise<DebateDTO> {
    const topic = findDebateTopic(input.topicKey);
    if (!topic) throw ApiException.badRequest('Unknown debate topic');

    let languageCode = input.languageCode;
    if (!languageCode) {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      languageCode = profile?.learningLanguageCode ?? undefined;
    }
    if (!languageCode) {
      throw ApiException.badRequest('Choose a learning language before starting a debate');
    }
    const language = await prisma.language.findFirst({
      where: { code: languageCode, isActive: true },
    });
    if (!language) throw ApiException.badRequest('Unknown language');

    const debate = await prisma.debate.create({
      data: {
        userId,
        languageCode,
        topicKey: topic.key,
        motion: topic.motion,
        userSide: input.side,
        level: input.level,
      },
    });
    // Record the practice activity for future progress analytics.
    await prisma.practiceSession.create({ data: { userId, kind: 'DEBATE' } });
    await recordActivity(userId, 'DEBATE');
    return toDebateDTO(debate);
  },

  /** Non-streaming turn: persists the learner's argument, gets the AI rebuttal, persists it. */
  async turn(
    userId: string,
    debateId: string,
    content: string,
  ): Promise<{ userMessage: DebateMessageDTO; assistantMessage: DebateMessageDTO }> {
    const debate = await getOwnedDebate(userId, debateId);
    if (debate.status === 'CLOSED') throw ApiException.badRequest('This debate is closed');

    const userMessage = await prisma.debateMessage.create({
      data: { debateId, role: 'USER', content },
    });

    const name = await languageName(debate.languageCode);
    const { messages, options } = buildContext(debate, name);
    messages.push({ role: 'user', content });
    const result = await getAIProvider().chat(messages, options);

    const assistantMessage = await prisma.debateMessage.create({
      data: { debateId, role: 'ASSISTANT', content: result.reply },
    });
    await touch(debateId);
    return { userMessage: toMessageDTO(userMessage), assistantMessage: toMessageDTO(assistantMessage) };
  },

  /** Scores the learner's arguments via the @vaani/ai debate-feedback abstraction, then closes. */
  async feedback(userId: string, debateId: string): Promise<DebateFeedback> {
    const debate = await getOwnedDebate(userId, debateId);
    const name = await languageName(debate.languageCode);
    const { messages, options } = buildContext(debate, name);
    const feedback = await getAIProvider().analyzeDebate(
      debate.motion,
      debate.userSide,
      messages,
      options,
    );
    if (debate.status !== 'CLOSED') {
      await prisma.debate.update({ where: { id: debateId }, data: { status: 'CLOSED' } });
    }
    return feedback;
  },
};
