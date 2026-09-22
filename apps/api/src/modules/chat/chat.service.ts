import type { Prisma } from '@prisma/client';
import {
  CHAT_TOPICS,
  findDialogueScenario,
  findRoleplayScenario,
  type AIFeedback,
  type ConversationDetailDTO,
  type ConversationDTO,
  type ConversationSummaryDTO,
  type MessageDTO,
  type StartConversationInput,
} from '@vaani/types';
import { buildDialoguePrompt, buildRoleplayPrompt, type ChatMessage, type ChatOptions } from '@vaani/ai';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import { getAIProvider } from '../../lib/ai.js';

type ConversationWithMessages = Prisma.ConversationGetPayload<{
  include: { messages: true; language: true };
}>;
type Message = Prisma.ConversationMessageGetPayload<object>;

function topicLabel(topic: string): string {
  return CHAT_TOPICS.find((t) => t.value === topic)?.label ?? 'general conversation';
}

function toMessageDTO(m: Message): MessageDTO {
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() };
}

function toConversationDTO(c: {
  id: string;
  title: string;
  mode: string;
  topic: string;
  scenarioKey: string | null;
  level: string;
  languageCode: string;
  createdAt: Date;
  updatedAt: Date;
}): ConversationDTO {
  return {
    id: c.id,
    title: c.title,
    mode: c.mode as ConversationDTO['mode'],
    topic: c.topic as ConversationDTO['topic'],
    scenarioKey: c.scenarioKey,
    level: c.level as ConversationDTO['level'],
    languageCode: c.languageCode,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Turns a stored conversation into provider-ready messages + options. */
function buildContext(conv: ConversationWithMessages): {
  messages: ChatMessage[];
  options: ChatOptions;
} {
  const messages: ChatMessage[] = conv.messages.map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }));
  const options: ChatOptions = {
    level: conv.level,
    languageCode: conv.languageCode,
    languageName: conv.language.name,
    topic: topicLabel(conv.topic),
  };

  // Roleplay/Dialogue modes drive the AI with a scenario-specific system prompt.
  if (conv.mode === 'ROLEPLAY' && conv.scenarioKey) {
    const scenario = findRoleplayScenario(conv.scenarioKey);
    if (scenario) options.systemPrompt = buildRoleplayPrompt(scenario, options);
  } else if (conv.mode === 'DIALOGUE' && conv.scenarioKey) {
    const scenario = findDialogueScenario(conv.scenarioKey);
    if (scenario) options.systemPrompt = buildDialoguePrompt(scenario, options);
  }

  return { messages, options };
}

async function getOwnedConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationWithMessages> {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } }, language: true },
  });
  if (!conv) throw ApiException.notFound('Conversation not found');
  return conv;
}

async function touch(conversationId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

export const chatService = {
  async listConversations(userId: string): Promise<ConversationSummaryDTO[]> {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
    });
    return conversations.map((c) => ({
      ...toConversationDTO(c),
      messageCount: c._count.messages,
      lastMessagePreview: c.messages[0]?.content.slice(0, 120) ?? null,
    }));
  },

  async getConversationDetail(userId: string, id: string): Promise<ConversationDetailDTO> {
    const conv = await getOwnedConversation(userId, id);
    return { ...toConversationDTO(conv), messages: conv.messages.map(toMessageDTO) };
  },

  async startConversation(userId: string, input: StartConversationInput): Promise<ConversationDTO> {
    // Resolve the language: explicit input wins, else the user's current learning language.
    let languageCode = input.languageCode;
    if (!languageCode) {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      languageCode = profile?.learningLanguageCode ?? undefined;
    }
    if (!languageCode) {
      throw ApiException.badRequest('Choose a learning language before starting a chat');
    }
    const language = await prisma.language.findFirst({
      where: { code: languageCode, isActive: true },
    });
    if (!language) throw ApiException.badRequest('Unknown language');

    // Resolve mode-specific title, scenario, and the AI's opening line (if any).
    let title: string;
    let opener: string | undefined;
    if (input.mode === 'ROLEPLAY') {
      const scenario = findRoleplayScenario(input.scenarioKey!);
      if (!scenario) throw ApiException.badRequest('Unknown roleplay scenario');
      title = `${scenario.title} · ${language.name}`;
      opener = scenario.aiOpener;
    } else if (input.mode === 'DIALOGUE') {
      const scenario = findDialogueScenario(input.scenarioKey!);
      if (!scenario) throw ApiException.badRequest('Unknown dialogue scenario');
      title = `${scenario.title} · ${language.name}`;
      opener = scenario.opener;
    } else {
      title = `${topicLabel(input.topic!)} · ${language.name}`;
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        languageCode,
        mode: input.mode,
        topic: input.topic ?? 'FREE',
        scenarioKey: input.scenarioKey ?? null,
        level: input.level,
        title,
        // Seed the AI's in-character opening line for scenario modes.
        messages: opener ? { create: { role: 'ASSISTANT', content: opener } } : undefined,
        // Record the practice activity for future progress analytics.
        practiceSessions: { create: { userId, kind: input.mode } },
      },
    });
    return toConversationDTO(conversation);
  },

  /** Non-streaming send: persists the user message, gets a reply, persists it. */
  async reply(
    userId: string,
    conversationId: string,
    content: string,
  ): Promise<{ userMessage: MessageDTO; assistantMessage: MessageDTO }> {
    const conv = await getOwnedConversation(userId, conversationId);
    const userMessage = await prisma.conversationMessage.create({
      data: { conversationId, role: 'USER', content },
    });

    const { messages, options } = buildContext(conv);
    messages.push({ role: 'user', content });
    const result = await getAIProvider().chat(messages, options);

    const assistantMessage = await prisma.conversationMessage.create({
      data: { conversationId, role: 'ASSISTANT', content: result.reply },
    });
    await touch(conversationId);
    return { userMessage: toMessageDTO(userMessage), assistantMessage: toMessageDTO(assistantMessage) };
  },

  /** Prepares a streaming turn: persists the user message and returns provider context. */
  async beginStream(
    userId: string,
    conversationId: string,
    content: string,
  ): Promise<{ userMessage: MessageDTO; messages: ChatMessage[]; options: ChatOptions }> {
    const conv = await getOwnedConversation(userId, conversationId);
    const userMessage = await prisma.conversationMessage.create({
      data: { conversationId, role: 'USER', content },
    });
    const { messages, options } = buildContext(conv);
    messages.push({ role: 'user', content });
    return { userMessage: toMessageDTO(userMessage), messages, options };
  },

  /** Persists the assembled assistant reply after streaming completes. */
  async finishStream(conversationId: string, content: string): Promise<MessageDTO> {
    const assistantMessage = await prisma.conversationMessage.create({
      data: { conversationId, role: 'ASSISTANT', content },
    });
    await touch(conversationId);
    return toMessageDTO(assistantMessage);
  },

  async feedback(userId: string, conversationId: string): Promise<AIFeedback> {
    const conv = await getOwnedConversation(userId, conversationId);
    const { messages, options } = buildContext(conv);
    return getAIProvider().analyze(messages, options);
  },

  getProviderName(): string {
    return getAIProvider().name;
  },
};
