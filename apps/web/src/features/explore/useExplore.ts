import { useQuery } from '@tanstack/react-query';
import { exploreApi } from './explore.api';

export function useExplore(date?: string) {
  return useQuery({
    queryKey: ['explore', date ?? 'today'],
    queryFn: () => exploreApi.daily(date),
  });
}
