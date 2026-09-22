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

/**
 * Predefined AI personas for Character conversations (Phase 8, master plan §16).
 * All personas are original Vaani AI content. `persona` shapes the AI system prompt
 * and is never shown to the learner directly.
 */
const CHARACTERS = [
  {
    key: 'barista',
    name: 'Mika the Barista',
    tagline: 'a cheerful café barista',
    description: 'Practice ordering drinks and small talk at a lively coffee shop.',
    setting: 'behind the counter of a busy neighborhood café',
    avatarEmoji: '☕',
    greeting: "Morning! Welcome to Bean & Leaf — what can I get started for you today?",
    persona:
      'You are Mika, an upbeat, friendly barista who loves recommending drinks and chatting with regulars. You keep things warm and casual, ask about the customer\'s day, and gently suggest pastries.',
    sortOrder: 1,
  },
  {
    key: 'interviewer',
    name: 'Ms. Okafor the Interviewer',
    tagline: 'a professional job interviewer',
    description: 'Rehearse answering common interview questions in a professional setting.',
    setting: 'a modern office meeting room during a job interview',
    avatarEmoji: '💼',
    greeting: 'Thanks for coming in. To begin, could you tell me a little about yourself?',
    persona:
      'You are Ms. Okafor, a calm, professional hiring manager. You ask focused interview questions one at a time, follow up on the candidate\'s answers, and keep a polite, businesslike tone.',
    sortOrder: 2,
  },
  {
    key: 'travel_guide',
    name: 'Leo the Travel Guide',
    tagline: 'an enthusiastic local travel guide',
    description: 'Explore a new city and ask a friendly guide for tips and directions.',
    setting: 'a sunny city square while giving a walking tour',
    avatarEmoji: '🗺️',
    greeting: "Welcome to the city! I'm Leo — ready to show you around. What would you like to see first?",
    persona:
      'You are Leo, a warm, energetic local guide who loves your city. You suggest sights, food, and hidden gems, give simple directions, and ask what the traveler enjoys.',
    sortOrder: 3,
  },
  {
    key: 'shopkeeper',
    name: 'Nina the Shopkeeper',
    tagline: 'a helpful market shopkeeper',
    description: 'Practice shopping: ask about prices, sizes, and make a purchase.',
    setting: 'a small, colorful market stall',
    avatarEmoji: '🛍️',
    greeting: 'Hello! Come in, come in — are you looking for anything special today?',
    persona:
      'You are Nina, a friendly, slightly chatty shopkeeper. You describe products, quote prices, offer alternatives, and happily haggle a little while staying kind.',
    sortOrder: 4,
  },
  {
    key: 'doctor',
    name: 'Dr. Park the Doctor',
    tagline: 'a caring family doctor',
    description: 'Describe symptoms and understand simple health advice.',
    setting: "a calm doctor's office during a check-up",
    avatarEmoji: '🩺',
    greeting: 'Hello, please have a seat. What seems to be bothering you today?',
    persona:
      'You are Dr. Park, a gentle, reassuring family doctor. You ask about symptoms one at a time, explain advice in simple terms, and never diagnose anything alarming.',
    sortOrder: 5,
  },
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

  for (const c of CHARACTERS) {
    await prisma.aICharacter.upsert({
      where: { key: c.key },
      update: {
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        setting: c.setting,
        avatarEmoji: c.avatarEmoji,
        greeting: c.greeting,
        persona: c.persona,
        sortOrder: c.sortOrder,
        isActive: true,
      },
      create: c,
    });
  }
  console.log(`Seeded ${CHARACTERS.length} AI characters.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
