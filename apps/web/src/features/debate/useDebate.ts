import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { StartDebateInput } from '@vaani/types';
import { queryClient } from '@/lib/queryClient';
import { debateApi } from './debate.api';

export function useDebate(id: string | undefined) {
  return useQuery({
    queryKey: ['debate', 'detail', id],
    queryFn: () => debateApi.detail(id!),
    enabled: Boolean(id),
  });
}

export function useStartDebate() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (input: StartDebateInput) => debateApi.start(input),
    onSuccess: (data) => {
      navigate(`/app/debate/${data.debate.id}`);
    },
  });
}

export function useDebateTurn(id: string | undefined) {
  return useMutation({
    mutationFn: (content: string) => debateApi.turn(id!, { content }),
  });
}

export function useDebateFeedback(id: string | undefined) {
  return useMutation({
    mutationFn: () => debateApi.feedback(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debate', 'detail', id] });
    },
  });
}
