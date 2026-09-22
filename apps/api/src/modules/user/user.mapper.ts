import type { Prisma } from '@prisma/client';
import type { UserDTO } from '@vaani/types';

/** Prisma user with its profile eagerly loaded. */
export type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>;

/** Maps a persisted user to the safe DTO sent to clients (no password hash). */
export function toUserDTO(user: UserWithProfile): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    learningLanguageCode: user.profile?.learningLanguageCode ?? null,
    level: user.profile?.level ?? null,
    dailyGoalMinutes: user.profile?.dailyGoalMinutes ?? 30,
    theme: user.profile?.theme ?? 'SYSTEM',
    createdAt: user.createdAt.toISOString(),
  };
}
