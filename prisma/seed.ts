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

/**
 * Sample courses (Phase 9, master plan §17). All content is original Vaani AI material,
 * structured as course → modules → lessons → exercises. Kept small but representative.
 */
const COURSES = [
  {
    slug: 'spanish-foundations',
    title: 'Spanish Foundations',
    description: 'Start speaking Spanish: greetings, introductions, and everyday essentials.',
    languageCode: 'es',
    level: 'BEGINNER' as const,
    coverEmoji: '🇪🇸',
    estimatedMinutes: 90,
    sortOrder: 1,
    modules: [
      {
        title: 'First Words',
        description: 'Greet people and introduce yourself with confidence.',
        lessons: [
          {
            title: 'Greetings',
            content:
              'Learn the core greetings: "hola" (hello), "buenos días" (good morning), and "adiós" (goodbye). Spanish greetings change with the time of day.',
            estimatedMinutes: 6,
            exercises: [
              {
                kind: 'MULTIPLE_CHOICE' as const,
                prompt: 'Which word means "hello" in Spanish?',
                options: ['Adiós', 'Hola', 'Gracias', 'Por favor'],
                answer: 'Hola',
                explanation: '"Hola" is the standard, all-purpose greeting.',
              },
              {
                kind: 'TRANSLATE' as const,
                prompt: 'Translate to Spanish: "Good morning".',
                options: [],
                answer: 'Buenos días',
                explanation: 'Use "buenos días" until about midday.',
              },
            ],
          },
          {
            title: 'Introducing Yourself',
            content:
              'Say your name with "Me llamo…" (My name is…) and ask "¿Cómo te llamas?" (What is your name?).',
            estimatedMinutes: 7,
            exercises: [
              {
                kind: 'FILL_BLANK' as const,
                prompt: 'Complete: "Me ____ Ana." (My name is Ana.)',
                options: [],
                answer: 'llamo',
                explanation: '"Me llamo" literally means "I call myself".',
              },
            ],
          },
        ],
      },
      {
        title: 'Everyday Essentials',
        description: 'Numbers and polite phrases you will use every day.',
        lessons: [
          {
            title: 'Numbers 1–10',
            content:
              'Count from uno to diez: uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez.',
            estimatedMinutes: 8,
            exercises: [
              {
                kind: 'MULTIPLE_CHOICE' as const,
                prompt: 'What is "three" in Spanish?',
                options: ['Dos', 'Tres', 'Cuatro', 'Cinco'],
                answer: 'Tres',
                explanation: '"Tres" is three.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'french-travel-basics',
    title: 'French Travel Basics',
    description: 'Handle real travel situations in French: directions, cafés, and check-ins.',
    languageCode: 'fr',
    level: 'ELEMENTARY' as const,
    coverEmoji: '🇫🇷',
    estimatedMinutes: 75,
    sortOrder: 2,
    modules: [
      {
        title: 'Getting Around',
        description: 'Ask for directions and understand the answers.',
        lessons: [
          {
            title: 'Asking for Directions',
            content:
              'Use "Où est…?" (Where is…?) and "à gauche/à droite" (left/right) to navigate a city.',
            estimatedMinutes: 8,
            exercises: [
              {
                kind: 'MULTIPLE_CHOICE' as const,
                prompt: 'How do you ask "Where is the station?" in French?',
                options: [
                  'Où est la gare ?',
                  'Quelle heure est-il ?',
                  'Comment ça va ?',
                  'Merci beaucoup',
                ],
                answer: 'Où est la gare ?',
                explanation: '"Où est…" begins a "where is" question.',
              },
              {
                kind: 'FREE_RESPONSE' as const,
                prompt: 'Write a short sentence in French asking where the museum is.',
                options: [],
                answer: 'Où est le musée ?',
                explanation: 'A natural phrasing is "Où est le musée ?".',
              },
            ],
          },
        ],
      },
      {
        title: 'At the Café',
        description: 'Order food and drinks politely.',
        lessons: [
          {
            title: 'Ordering a Coffee',
            content:
              'Order politely with "Je voudrais…" (I would like…) and "s\'il vous plaît" (please).',
            estimatedMinutes: 7,
            exercises: [
              {
                kind: 'TRANSLATE' as const,
                prompt: 'Translate to French: "I would like a coffee, please."',
                options: [],
                answer: "Je voudrais un café, s'il vous plaît.",
                explanation: '"Je voudrais" is the polite way to order.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'english-conversation-boost',
    title: 'English Conversation Boost',
    description: 'Sharpen everyday English conversation, small talk, and natural phrasing.',
    languageCode: 'en',
    level: 'INTERMEDIATE' as const,
    coverEmoji: '💬',
    estimatedMinutes: 60,
    sortOrder: 3,
    modules: [
      {
        title: 'Small Talk',
        description: 'Break the ice and keep a conversation flowing.',
        lessons: [
          {
            title: 'Openers and Follow-ups',
            content:
              'Good openers ("How\'s your day going?") invite more than yes/no answers. Follow up with "What about you?" to keep it balanced.',
            estimatedMinutes: 9,
            exercises: [
              {
                kind: 'MULTIPLE_CHOICE' as const,
                prompt: 'Which is the most natural small-talk opener?',
                options: [
                  'State your full name and job title.',
                  "How's your day going?",
                  'Recite the weather forecast.',
                  'Say nothing and wait.',
                ],
                answer: "How's your day going?",
                explanation: 'Open-ended, friendly questions invite conversation.',
              },
              {
                kind: 'FREE_RESPONSE' as const,
                prompt:
                  'Write a friendly follow-up question you could ask after someone mentions their weekend.',
                options: [],
                answer: 'What did you get up to over the weekend?',
                explanation: 'Follow-up questions show interest and keep the talk going.',
              },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Sample shared flashcard decks. All content is original Vaani AI material. These are
 * *system* decks (no owner) visible to every learner; users can also generate their own
 * decks via the `@vaani/ai` abstraction at runtime.
 */
const FLASHCARD_DECKS = [
  {
    title: 'Spanish Travel Essentials',
    description: 'Handy words and phrases for getting around while travelling in Spanish.',
    languageCode: 'es',
    sortOrder: 1,
    cards: [
      { term: 'el aeropuerto', translation: 'the airport', example: '¿Dónde está el aeropuerto?' },
      { term: 'la estación', translation: 'the station', example: 'La estación está cerca.' },
      { term: 'el billete', translation: 'the ticket', example: 'Necesito un billete, por favor.' },
      { term: 'la maleta', translation: 'the suitcase', example: 'Mi maleta es azul.' },
      { term: '¿Cuánto cuesta?', translation: 'How much is it?', example: '¿Cuánto cuesta el billete?' },
      { term: 'a la derecha', translation: 'to the right', example: 'Gire a la derecha.' },
    ],
  },
  {
    title: 'French Café Basics',
    description: 'Order food and drinks politely in a French café.',
    languageCode: 'fr',
    sortOrder: 2,
    cards: [
      { term: 'un café', translation: 'a coffee', example: 'Je voudrais un café, s\'il vous plaît.' },
      { term: 'l\'addition', translation: 'the bill', example: 'L\'addition, s\'il vous plaît.' },
      { term: 'une baguette', translation: 'a baguette', example: 'Une baguette, merci.' },
      { term: 's\'il vous plaît', translation: 'please', example: 'Un thé, s\'il vous plaît.' },
      { term: 'merci', translation: 'thank you', example: 'Merci beaucoup !' },
    ],
  },
];

async function seedFlashcardDecks() {
  for (const deck of FLASHCARD_DECKS) {
    // Deterministic re-seed: replace the system deck of this title if it already exists.
    const existing = await prisma.flashcardDeck.findFirst({
      where: { title: deck.title, isSystem: true },
      select: { id: true },
    });
    if (existing) {
      await prisma.flashcardDeck.delete({ where: { id: existing.id } });
    }
    await prisma.flashcardDeck.create({
      data: {
        title: deck.title,
        description: deck.description,
        languageCode: deck.languageCode,
        isSystem: true,
        sortOrder: deck.sortOrder,
        cards: {
          create: deck.cards.map((c, i) => ({
            term: c.term,
            translation: c.translation,
            example: c.example,
            ordinal: i,
          })),
        },
      },
    });
  }
  console.log(`Seeded ${FLASHCARD_DECKS.length} flashcard decks.`);
}

async function seedCourses() {
  for (const course of COURSES) {
    const { modules } = course;
    const saved = await prisma.course.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        description: course.description,
        languageCode: course.languageCode,
        level: course.level,
        coverEmoji: course.coverEmoji,
        estimatedMinutes: course.estimatedMinutes,
        sortOrder: course.sortOrder,
        isPublished: true,
      },
      create: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        languageCode: course.languageCode,
        level: course.level,
        coverEmoji: course.coverEmoji,
        estimatedMinutes: course.estimatedMinutes,
        sortOrder: course.sortOrder,
      },
    });

    // Rebuild the module/lesson/exercise tree deterministically on each seed run.
    await prisma.courseModule.deleteMany({ where: { courseId: saved.id } });

    for (const [mIndex, mod] of modules.entries()) {
      const savedModule = await prisma.courseModule.create({
        data: {
          courseId: saved.id,
          title: mod.title,
          description: mod.description,
          ordinal: mIndex,
        },
      });
      for (const [lIndex, lesson] of mod.lessons.entries()) {
        const savedLesson = await prisma.lesson.create({
          data: {
            moduleId: savedModule.id,
            title: lesson.title,
            content: lesson.content,
            ordinal: lIndex,
            estimatedMinutes: lesson.estimatedMinutes,
          },
        });
        for (const [eIndex, ex] of lesson.exercises.entries()) {
          await prisma.exercise.create({
            data: {
              lessonId: savedLesson.id,
              kind: ex.kind,
              prompt: ex.prompt,
              options: ex.options,
              answer: ex.answer,
              explanation: ex.explanation,
              ordinal: eIndex,
            },
          });
        }
      }
    }
  }
  console.log(`Seeded ${COURSES.length} courses.`);
}

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

  await seedCourses();
  await seedFlashcardDecks();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
