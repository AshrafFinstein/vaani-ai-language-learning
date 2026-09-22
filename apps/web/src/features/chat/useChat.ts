import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { StartConversationInput } from '@vaani/types';
import { queryClient } from '@/lib/queryClient';
import { chatApi } from './chat.api';

export function useChatHistory() {
  return useQuery({
    queryKey: ['chat', 'history'],
    queryFn: chatApi.history,
  });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: ['chat', 'conversation', id],
    queryFn: () => chatApi.detail(id!),
    enabled: Boolean(id),
  });
}

export function useStartConversation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (input: StartConversationInput) => chatApi.start(input),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
      navigate(`/app/chat/${data.conversation.id}`);
    },
  });
}

export function useFeedback(id: string | undefined) {
  return useMutation({
    mutationFn: () => chatApi.feedback(id!),
  });
}

export function invalidateHistory() {
  void queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
}
