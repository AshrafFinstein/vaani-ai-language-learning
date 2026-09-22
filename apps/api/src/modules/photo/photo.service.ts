import type { Prisma } from '@prisma/client';
import type {
  PhotoMessageDTO,
  PhotoSessionDetailDTO,
  PhotoSessionDTO,
  StartPhotoSessionInput,
} from '@vaani/types';
import { buildPhotoPrompt, type ChatMessage, type ChatOptions } from '@vaani/ai';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import { getAIProvider } from '../../lib/ai.js';

type PhotoWithMessages = Prisma.PhotoSessionGetPayload<{ include: { messages: true } }>;
type PhotoMessage = Prisma.PhotoMessageGetPayload<object>;

function toMessageDTO(m: PhotoMessage): PhotoMessageDTO {
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() };
}

function toSessionDTO(s: {
  id: string;
  imageUrl: string;
  description: string;
  level: PhotoSessionDTO['level'];
  languageCode: string;
  createdAt: Date;
  updatedAt: Date;
}): PhotoSessionDTO {
  return {
    id: s.id,
    imageUrl: s.imageUrl,
    description: s.description,
    level: s.level,
    languageCode: s.languageCode,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function buildContext(session: PhotoWithMessages, languageName?: string): {
  messages: ChatMessage[];
  options: ChatOptions;
} {
  const messages: ChatMessage[] = session.messages.map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }));
  const options: ChatOptions = {
    level: session.level,
    languageCode: session.languageCode,
    languageName,
    systemPrompt: buildPhotoPrompt(session.description, {
      level: session.level,
      languageName,
    }),
  };
  return { messages, options };
}

async function getOwnedSession(userId: string, id: string): Promise<PhotoWithMessages> {
  const session = await prisma.photoSession.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) throw ApiException.notFound('Photo session not found');
  return session;
}

async function languageName(code: string): Promise<string | undefined> {
  const language = await prisma.language.findFirst({ where: { code } });
  return language?.name;
}

async function touch(id: string): Promise<void> {
  await prisma.photoSession.update({ where: { id }, data: { updatedAt: new Date() } });
}

export const photoService = {
  async listSessions(userId: string): Promise<PhotoSessionDTO[]> {
    const sessions = await prisma.photoSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return sessions.map(toSessionDTO);
  },

  async getSessionDetail(userId: string, id: string): Promise<PhotoSessionDetailDTO> {
    const session = await getOwnedSession(userId, id);
    return { ...toSessionDTO(session), messages: session.messages.map(toMessageDTO) };
  },

  /**
   * Starts a photo conversation. The image (data-URL or remote URL) is stored as-is, and
   * the MOCK vision method on the @vaani/ai provider produces a deterministic description
   * that seeds the AI's opening line. NO real image analysis happens here.
   */
  async startSession(userId: string, input: StartPhotoSessionInput): Promise<PhotoSessionDTO> {
    let languageCode = input.languageCode;
    if (!languageCode) {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      languageCode = profile?.learningLanguageCode ?? undefined;
    }
    if (!languageCode) {
      throw ApiException.badRequest('Choose a learning language before starting');
    }
    const language = await prisma.language.findFirst({
      where: { code: languageCode, isActive: true },
    });
    if (!language) throw ApiException.badRequest('Unknown language');

    const provider = getAIProvider();
    const vision = await provider.describeImage(input.image, {
      level: input.level,
      languageName: language.name,
    });

    // Generate the AI's opening line grounded in the (mock) description.
    const opener = await provider.chat(
      [{ role: 'user', content: "Let's talk about my photo." }],
      {
        level: input.level,
        languageName: language.name,
        systemPrompt: buildPhotoPrompt(vision.description, {
          level: input.level,
          languageName: language.name,
        }),
      },
    );

    const session = await prisma.photoSession.create({
      data: {
        userId,
        languageCode,
        imageUrl: input.image,
        description: vision.description,
        level: input.level,
        messages: { create: { role: 'ASSISTANT', content: opener.reply } },
        // Record the practice activity for future progress analytics.
      },
    });
    await prisma.practiceSession.create({ data: { userId, kind: 'PHOTO' } });
    return toSessionDTO(session);
  },

  /** Non-streaming reply: persists the learner message, gets a reply about the photo, persists it. */
  async reply(
    userId: string,
    id: string,
    content: string,
  ): Promise<{ userMessage: PhotoMessageDTO; assistantMessage: PhotoMessageDTO }> {
    const session = await getOwnedSession(userId, id);
    const userMessage = await prisma.photoMessage.create({
      data: { photoSessionId: id, role: 'USER', content },
    });

    const name = await languageName(session.languageCode);
    const { messages, options } = buildContext(session, name);
    messages.push({ role: 'user', content });
    const result = await getAIProvider().chat(messages, options);

    const assistantMessage = await prisma.photoMessage.create({
      data: { photoSessionId: id, role: 'ASSISTANT', content: result.reply },
    });
    await touch(id);
    return { userMessage: toMessageDTO(userMessage), assistantMessage: toMessageDTO(assistantMessage) };
  },
};
