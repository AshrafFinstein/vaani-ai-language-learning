import type {
  PhotoMessageDTO,
  PhotoMessageInput,
  PhotoSessionDetailDTO,
  PhotoSessionDTO,
  StartPhotoSessionInput,
} from '@vaani/types';
import { api } from '@/lib/api';

export const photoApi = {
  list: () => api.get<{ sessions: PhotoSessionDTO[] }>('/api/photos'),
  start: (input: StartPhotoSessionInput) =>
    api.post<{ session: PhotoSessionDTO }>('/api/photos', input),
  detail: (id: string) => api.get<{ session: PhotoSessionDetailDTO }>(`/api/photos/${id}`),
  send: (id: string, input: PhotoMessageInput) =>
    api.post<{ userMessage: PhotoMessageDTO; assistantMessage: PhotoMessageDTO }>(
      `/api/photos/${id}/messages`,
      input,
    ),
};
