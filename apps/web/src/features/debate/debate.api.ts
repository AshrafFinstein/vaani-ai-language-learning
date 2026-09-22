import type {
  DebateDetailDTO,
  DebateDTO,
  DebateFeedback,
  DebateMessageDTO,
  DebateSummaryDTO,
  DebateTurnInput,
  StartDebateInput,
} from '@vaani/types';
import { api } from '@/lib/api';

export const debateApi = {
  list: () => api.get<{ debates: DebateSummaryDTO[] }>('/api/debates'),
  start: (input: StartDebateInput) => api.post<{ debate: DebateDTO }>('/api/debates', input),
  detail: (id: string) => api.get<{ debate: DebateDetailDTO }>(`/api/debates/${id}`),
  turn: (id: string, input: DebateTurnInput) =>
    api.post<{ userMessage: DebateMessageDTO; assistantMessage: DebateMessageDTO }>(
      `/api/debates/${id}/turns`,
      input,
    ),
  feedback: (id: string) => api.post<{ feedback: DebateFeedback }>(`/api/debates/${id}/feedback`),
};
