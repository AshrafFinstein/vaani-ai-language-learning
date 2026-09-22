import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Launch languages (spec §13). Language-specific logic is never hard-coded elsewhere. */
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flagEmoji: '🇬🇧', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flagEmoji: '🇫🇷', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flagEmoji: '🇩🇪', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flagEmoji: '🇮🇹', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flagEmoji: '🇵🇹', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flagEmoji: '🇯🇵', rtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flagEmoji: '🇰🇷', rtl: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flagEmoji: '🇨🇳', rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flagEmoji: '🇮🇳', rtl: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flagEmoji: '🇮🇳', rtl: false },
];

async function main() {
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { name: lang.name, nativeName: lang.nativeName, flagEmoji: lang.flagEmoji, rtl: lang.rtl },
      create: lang,
    });
  }
  console.log(`Seeded ${LANGUAGES.length} languages.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
