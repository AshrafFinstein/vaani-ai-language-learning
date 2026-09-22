import type { CharacterDTO, ConversationDTO, StartCharacterChatInput } from '@vaani/types';
import { prisma } from '../../prisma.js';
import { chatService } from '../chat/chat.service.js';

type CharacterRow = {
  id: string;
  key: string;
  name: string;
  tagline: string;
  description: string;
  setting: string;
  avatarEmoji: string;
  greeting: string;
  persona: string;
};

function toCharacterDTO(c: CharacterRow): CharacterDTO {
  return {
    id: c.id,
    key: c.key,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    setting: c.setting,
    avatarEmoji: c.avatarEmoji,
    greeting: c.greeting,
    persona: c.persona,
  };
}

export const characterService = {
  /** Lists the active AI personas learners can converse with. */
  async listCharacters(): Promise<CharacterDTO[]> {
    const characters = await prisma.aICharacter.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return characters.map(toCharacterDTO);
  },

  /**
   * Starts a character conversation. Delegates to the chat service so the persona chat
   * reuses the shared streaming/history/feedback pipeline (mode = CHARACTER).
   */
  async startCharacterChat(
    userId: string,
    input: StartCharacterChatInput,
  ): Promise<ConversationDTO> {
    return chatService.startCharacterConversation(
      userId,
      input.characterKey,
      input.level,
      input.languageCode,
    );
  },
};
