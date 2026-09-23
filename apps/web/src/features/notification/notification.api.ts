import type { NotificationDTO, NotificationListDTO } from '@vaani/types';
import { api } from '@/lib/api';

export const notificationApi = {
  list: () => api.get<NotificationListDTO>('/api/notifications'),
  markRead: (id: string) =>
    api.post<{ notification: NotificationDTO }>(`/api/notifications/${id}/read`, {}),
  markAllRead: () => api.post<{ updated: number }>('/api/notifications/read-all', {}),
};
