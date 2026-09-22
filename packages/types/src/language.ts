import { z } from 'zod';

export const LanguageDTO = z.object({
  code: z.string(), // ISO-ish code, e.g. "en", "es", "ta"
  name: z.string(), // English name, e.g. "Spanish"
  nativeName: z.string(), // Endonym, e.g. "Español"
  flagEmoji: z.string(),
  rtl: z.boolean(),
});
export type LanguageDTO = z.infer<typeof LanguageDTO>;
