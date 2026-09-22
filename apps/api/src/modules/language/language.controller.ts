import type { Request, Response } from 'express';
import type { LanguageDTO } from '@vaani/types';
import { prisma } from '../../prisma.js';

export const languageController = {
  async list(_req: Request, res: Response): Promise<void> {
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    const data: LanguageDTO[] = languages.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      flagEmoji: l.flagEmoji,
      rtl: l.rtl,
    }));
    res.status(200).json({ data });
  },
};
