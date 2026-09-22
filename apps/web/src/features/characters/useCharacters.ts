import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { StartCharacterChatInput } from '@vaani/types';
import { queryClient } from '@/lib/queryClient';
import { charactersApi } from './characters.api';

export function useCharacters() {
  return useQuery({
    queryKey: ['characters', 'list'],
    queryFn: charactersApi.list,
  });
}

/**
 * Starts a character conversation and navigates to its chat page. Character chats reuse
 * the shared chat conversation room, so we route into /app/characters/:id.
 */
export function useStartCharacterChat() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (input: StartCharacterChatInput) => charactersApi.start(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
      navigate(`/app/characters/${data.conversation.id}`);
    },
  });
}
