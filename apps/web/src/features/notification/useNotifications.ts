import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from './notification.api';

const KEY = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => notificationApi.list(),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
