import { describe, expect, it } from 'vitest';
import {
  MockAIProvider,
  parseFeedback,
  parseDebateFeedback,
  createAIProvider,
  buildRoleplayPrompt,
  buildCharacterPrompt,
  buildDebatePrompt,
  buildPhotoPrompt,
  buildLearningPathPrompt,
} from '@vaani/ai';
import {
  DEBATE_TOPICS,
  ROLEPLAY_SCENARIOS,
  type CharacterDTO,
  type LearningPathCatalogItem,
} from '@vaani/types';

describe('MockAIProvider', () => {
  const provider = new MockAIProvider();
  const history = [
    { role: 'user' as const, content: 'Hello there' },
    { role: 'assistant' as const, content: 'Hi!' },
    { role: 'user' as const, content: 'I went to the market yesterday' },
  ];

  it('returns a non-empty reply', async () => {
    const { reply } = await provider.chat(history, { level: 'INTERMEDIATE', languageName: 'Spanish' });
    expect(reply.length).toBeGreaterThan(0);
  });

  it('streams deltas that reconstruct a reply', async () => {
    let streamed = '';
    for await (const delta of provider.streamChat(history)) streamed += delta;
    expect(streamed.trim().length).toBeGreaterThan(0);
  });

  it('produces schema-valid feedback with bounded scores', async () => {
    const feedback = await provider.analyze(history, { level: 'INTERMEDIATE' });
    expect(feedback.reply).toBeTruthy();
    for (const score of [feedback.grammar_score, feedback.fluency_score, feedback.overall_score]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('parseFeedback', () => {
  it('parses fenced JSON and validates it', () => {
    const raw = '```json\n{"reply":"Good job","grammar_score":90}\n```';
    const fb = parseFeedback(raw);
    expect(fb.reply).toBe('Good job');
    expect(fb.grammar_score).toBe(90);
    expect(fb.corrections).toEqual([]); // schema default
  });

  it('never throws on garbage output', () => {
    const fb = parseFeedback('not json at all');
    expect(fb.reply).toBeTruthy();
    expect(fb.overall_score).toBe(0);
  });
});

describe('MockAIProvider.evaluateSentence', () => {
  const provider = new MockAIProvider();

  it('flags a lowercase, unpunctuated sentence and fixes it', async () => {
    const evaluation = await provider.evaluateSentence('Tell me about your day.', 'i went to work');
    expect(evaluation.isCorrect).toBe(false);
    expect(evaluation.corrected).toBe('I went to work.');
    expect(evaluation.overall_score).toBeGreaterThanOrEqual(0);
    expect(evaluation.overall_score).toBeLessThanOrEqual(100);
  });

  it('accepts a well-formed sentence', async () => {
    const evaluation = await provider.evaluateSentence('Tell me about your day.', 'I went to work.');
    expect(evaluation.isCorrect).toBe(true);
  });
});

describe('buildRoleplayPrompt', () => {
  it('embeds the scenario role and language', () => {
    const scenario = ROLEPLAY_SCENARIOS[0]!;
    const prompt = buildRoleplayPrompt(scenario, { languageName: 'Spanish', level: 'BEGINNER' });
    expect(prompt).toContain(scenario.aiRole);
    expect(prompt).toContain('Spanish');
  });
});

describe('MockAIProvider.describeImage (mock vision)', () => {
  const provider = new MockAIProvider();

  it('returns a deterministic description + tags for the same image', async () => {
    const image = 'data:image/png;base64,AAAABBBBCCCC';
    const a = await provider.describeImage(image);
    const b = await provider.describeImage(image);
    expect(a.description.length).toBeGreaterThan(0);
    expect(a.tags.length).toBeGreaterThan(0);
    // Deterministic: identical input yields identical output (no network, no keys).
    expect(a).toEqual(b);
  });

  it('varies the description across different images', async () => {
    const results = await Promise.all(
      ['https://x/one.jpg', 'https://x/two.jpg', 'https://x/three.jpg', 'data:image/png;base64,ZZZZ'].map(
        (img) => provider.describeImage(img),
      ),
    );
    const unique = new Set(results.map((r) => r.description));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('accepts an http image URL as well as a data-URL', async () => {
    const result = await provider.describeImage('https://example.com/pic.jpg');
    expect(typeof result.description).toBe('string');
    expect(Array.isArray(result.tags)).toBe(true);
  });
});

describe('MockAIProvider.analyzeDebate', () => {
  const provider = new MockAIProvider();

  it('produces schema-valid debate feedback with bounded scores', async () => {
    const messages = [
      { role: 'user' as const, content: 'Remote work boosts focus and saves commute time every day.' },
      { role: 'assistant' as const, content: 'But offices build culture and spontaneous collaboration.' },
      { role: 'user' as const, content: 'Tools like video calls replace that collaboration effectively now.' },
    ];
    const feedback = await provider.analyzeDebate('Remote work is better.', 'FOR', messages);
    expect(feedback.summary).toBeTruthy();
    for (const score of [
      feedback.argument_quality_score,
      feedback.persuasiveness_score,
      feedback.overall_score,
    ]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('parseDebateFeedback', () => {
  it('parses fenced JSON and validates it', () => {
    const raw = '```json\n{"summary":"Strong case","overall_score":88}\n```';
    const fb = parseDebateFeedback(raw);
    expect(fb.summary).toBe('Strong case');
    expect(fb.overall_score).toBe(88);
    expect(fb.strengths).toEqual([]); // schema default
  });

  it('never throws on garbage output', () => {
    const fb = parseDebateFeedback('not json');
    expect(fb.summary).toBeTruthy();
    expect(fb.overall_score).toBe(0);
  });
});

describe('advanced-mode prompts', () => {
  const character: CharacterDTO = {
    id: 'c1',
    key: 'barista',
    name: 'Mika',
    tagline: 'a cheerful barista',
    description: 'coffee chat',
    setting: 'a café',
    avatarEmoji: '☕',
    greeting: 'Hi!',
    persona: 'You love recommending drinks.',
  };

  it('buildCharacterPrompt embeds the persona name and language', () => {
    const prompt = buildCharacterPrompt(character, { languageName: 'French', level: 'BEGINNER' });
    expect(prompt).toContain('Mika');
    expect(prompt).toContain('French');
    expect(prompt).toContain(character.persona);
  });

  it('buildDebatePrompt assigns the AI the opposite side', () => {
    const topic = DEBATE_TOPICS[0]!;
    const prompt = buildDebatePrompt(topic.motion, 'FOR', { languageName: 'Spanish' });
    expect(prompt).toContain(topic.motion);
    expect(prompt).toContain('argue AGAINST');
  });

  it('buildPhotoPrompt grounds the AI in the description', () => {
    const prompt = buildPhotoPrompt('A sunny beach with umbrellas.', { languageName: 'German' });
    expect(prompt).toContain('sunny beach');
    expect(prompt).toContain('German');
  });
});

describe('MockAIProvider.evaluateExercise (course grading)', () => {
  const provider = new MockAIProvider();

  it('marks a matching answer correct with full score, no network call', async () => {
    const result = await provider.evaluateExercise(
      'Translate to Spanish: Good morning.',
      'Buenos días',
      'buenos dias',
    );
    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswer).toBe('Buenos días');
    expect(result.score).toBe(100);
  });

  it('marks an unrelated answer incorrect with a low score', async () => {
    const result = await provider.evaluateExercise(
      'Translate to Spanish: Good morning.',
      'Buenos días',
      'completely wrong text here',
    );
    expect(result.isCorrect).toBe(false);
    expect(result.score).toBeLessThan(60);
  });
});

describe('MockAIProvider.generateLearningPath', () => {
  const provider = new MockAIProvider();
  const catalog: LearningPathCatalogItem[] = [
    {
      slug: 'spanish-foundations',
      title: 'Spanish Foundations',
      level: 'BEGINNER',
      languageCode: 'es',
      description: 'Greetings and essentials.',
    },
    {
      slug: 'spanish-intermediate',
      title: 'Spanish Intermediate',
      level: 'INTERMEDIATE',
      languageCode: 'es',
      description: 'Deeper conversation.',
    },
    {
      slug: 'french-travel-basics',
      title: 'French Travel Basics',
      level: 'ELEMENTARY',
      languageCode: 'fr',
      description: 'Travel phrases.',
    },
  ];

  it('is deterministic and recommends only real catalog slugs, easiest first', async () => {
    const a = await provider.generateLearningPath(catalog, { languageCode: 'es', level: 'BEGINNER' });
    const b = await provider.generateLearningPath(catalog, { languageCode: 'es', level: 'BEGINNER' });
    expect(a).toEqual(b); // deterministic, no network/keys

    expect(a.summary).toBeTruthy();
    expect(a.steps.length).toBeGreaterThan(0);
    const allowed = new Set(catalog.map((c) => c.slug));
    for (const step of a.steps) expect(allowed.has(step.courseSlug)).toBe(true);
    // Filtered to Spanish and ordered by level (BEGINNER before INTERMEDIATE).
    expect(a.steps.map((s) => s.courseSlug)).toEqual([
      'spanish-foundations',
      'spanish-intermediate',
    ]);
  });

  it('returns an empty plan (no throw) for an empty catalog', async () => {
    const path = await provider.generateLearningPath([]);
    expect(path.steps).toEqual([]);
    expect(path.summary).toBeTruthy();
  });
});

describe('buildLearningPathPrompt', () => {
  it('lists the catalog slugs and forbids inventing new ones', () => {
    const prompt = buildLearningPathPrompt(
      [
        {
          slug: 'spanish-foundations',
          title: 'Spanish Foundations',
          level: 'BEGINNER',
          languageCode: 'es',
          description: 'Greetings.',
        },
      ],
      { languageName: 'Spanish', level: 'BEGINNER', goal: 'travel' },
    );
    expect(prompt).toContain('spanish-foundations');
    expect(prompt).toContain('Spanish');
    expect(prompt).toContain('travel');
    expect(prompt).toContain('never invent a slug');
  });
});

describe('createAIProvider', () => {
  it('defaults to the mock provider when unset', () => {
    expect(createAIProvider({}).name).toBe('mock');
  });

  it('throws for openai without an API key', () => {
    expect(() => createAIProvider({ provider: 'openai' })).toThrow(/API key/i);
  });
});
