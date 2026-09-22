import { useMutation } from '@tanstack/react-query';
import type { SentenceEvaluation, SubmitSentenceInput } from '@vaani/types';
import { api } from '@/lib/api';

export function useEvaluateSentence() {
  return useMutation({
    mutationFn: (input: SubmitSentenceInput) =>
      api.post<{ evaluation: SentenceEvaluation }>('/api/practice/sentence', input),
  });
}
