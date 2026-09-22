import type { CharacterDTO, ConversationDTO, StartCharacterChatInput } from '@vaani/types';
import { api } from '@/lib/api';

export const charactersApi = {
  list: () => api.get<{ characters: CharacterDTO[] }>('/api/characters'),
  start: (input: StartCharacterChatInput) =>
    api.post<{ conversation: ConversationDTO }>('/api/characters', input),
};
