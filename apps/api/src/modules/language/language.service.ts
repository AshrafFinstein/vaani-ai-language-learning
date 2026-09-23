import type { LanguageDTO } from '@vaani/types';
import { prisma } from '../../prisma.js';

export const languageService = {
  /** Active languages, alphabetical — the catalog users pick from. */
  async listActive(): Promise<LanguageDTO[]> {
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return languages.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      flagEmoji: l.flagEmoji,
      rtl: l.rtl,
    }));
  },
};
