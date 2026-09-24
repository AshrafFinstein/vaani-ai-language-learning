import type { NotificationDTO, NotificationListDTO, NotificationType } from '@vaani/types';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';

function toDTO(n: {
  id: string;
  type: string;
  title: string;
  body: string;
  meetingId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDTO {
  return {
    id: n.id,
    type: n.type as NotificationType,
    title: n.title,
    body: n.body,
    meetingId: n.meetingId,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  meetingId?: string;
}

/**
 * In-app notifications only — push/desktop delivery is deferred (see
 * docs/MEETING_AUTOMATION_ARCHITECTURE.md). All methods are user-scoped so a user
 * can only ever see or mutate their own notifications.
 */
export const notificationService = {
  /** Creates a notification for a user (best-effort; used by scheduler + analysis). */
  async create(userId: string, input: CreateNotificationInput): Promise<NotificationDTO> {
    const n = await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        meetingId: input.meetingId ?? null,
      },
    });
    return toDTO(n);
  },

  async list(userId: string): Promise<NotificationListDTO> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });
    return { notifications: notifications.map(toDTO), unreadCount };
  },

  /** Marks one notification read (owner-only). */
  async markRead(userId: string, id: string): Promise<NotificationDTO> {
    const existing = await prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) throw ApiException.notFound('Notification not found');
    const n = await prisma.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });
    return toDTO(n);
  },

  /** Marks all of a user's notifications read. */
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  },
};
