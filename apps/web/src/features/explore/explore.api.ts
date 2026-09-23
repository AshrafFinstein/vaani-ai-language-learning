import type { ExplorePayloadDTO } from '@vaani/types';
import { api } from '@/lib/api';

export const exploreApi = {
  daily: (date?: string) =>
    api.get<ExplorePayloadDTO>(date ? `/api/explore?date=${encodeURIComponent(date)}` : '/api/explore'),
};
