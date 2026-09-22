import type { UpdateProfileInput, UserDTO } from '@vaani/types';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import { toUserDTO } from './user.mapper.js';

export const userService = {
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDTO> {
    // Validate the referenced language exists & is active before assigning it.
    if (input.learningLanguageCode) {
      const language = await prisma.language.findFirst({
        where: { code: input.learningLanguageCode, isActive: true },
      });
      if (!language) throw ApiException.badRequest('Unknown language');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        profile: {
          update: {
            learningLanguageCode: input.learningLanguageCode,
            level: input.level,
            dailyGoalMinutes: input.dailyGoalMinutes,
            theme: input.theme,
          },
        },
      },
      include: { profile: true },
    });

    return toUserDTO(user);
  },
};
