import { useQuery } from '@tanstack/react-query';
import type { LanguageDTO } from '@vaani/types';
import { api } from '@/lib/api';

export function useLanguages() {
  return useQuery({
    queryKey: ['languages'],
    queryFn: () => api.get<LanguageDTO[]>('/api/languages'),
    staleTime: 60 * 60 * 1000, // languages rarely change
  });
}
