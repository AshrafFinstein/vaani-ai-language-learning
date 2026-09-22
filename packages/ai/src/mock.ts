import {
  AIFeedbackSchema,
  DebateFeedbackSchema,
  ExerciseResultSchema,
  GeneratedFlashcardDeckSchema,
  LearningPathSchema,
  SentenceEvaluationSchema,
  type AIFeedback,
  type DebateFeedback,
  type ExerciseResult,
  type GeneratedFlashcardDeck,
  type LearningPath,
  type LearningPathCatalogItem,
  type SentenceEvaluation,
} from '@vaani/types';
import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResult,
  ImageDescriptionResult,
  SpeechToTextProvider,
  SpeechToTextResult,
  TextToSpeechProvider,
  TextToSpeechResult,
} from './types.js';

/**
 * Deterministic, offline AI provider for local development and tests.
 * Produces plausible tutor-style replies without any network call or API key.
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  private lastUserMessage(messages: ChatMessage[]): string {
    return [...messages].reverse().find((m) => m.role === 'user')?.content.trim() ?? '';
  }

  private buildReply(messages: ChatMessage[], options?: ChatOptions): string {
    const text = this.lastUserMessage(messages);
    const isFirst = messages.filter((m) => m.role === 'user').length <= 1;
    if (!text || isFirst) {
      const topic = options?.topic ? ` about ${options.topic.toLowerCase()}` : '';
      return `Hi! I'm Vaani, your practice partner. Let's chat${topic}. What would you like to talk about?`;
    }
    return `That's interesting — "${text.slice(0, 80)}". Tell me a bit more, and why do you feel that way?`;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    return { reply: this.buildReply(messages, options) };
  }

  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const reply = this.buildReply(messages, options);
    // Emit word-by-word so the client can render a realistic streaming effect.
    const words = reply.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield i === 0 ? words[i]! : ` ${words[i]!}`;
    }
  }

  async analyze(messages: ChatMessage[], _options?: ChatOptions): Promise<AIFeedback> {
    const userMessages = messages.filter((m) => m.role === 'user');
    const last = userMessages.at(-1)?.content.trim() ?? '';

    // A tiny heuristic so the mock produces a believable correction sometimes.
    const firstChar = last[0] ?? '';
    const corrections =
      last && firstChar === firstChar.toLowerCase() && /[a-z]/.test(firstChar)
        ? [
            {
              original: last,
              corrected: last.charAt(0).toUpperCase() + last.slice(1),
              explanation: 'Start sentences with a capital letter.',
            },
          ]
        : [];

    return AIFeedbackSchema.parse({
      reply: userMessages.length
        ? 'Nice work keeping the conversation going! Here are a few things to polish.'
        : 'Say a few things first and I can give you feedback.',
      corrections,
      vocabulary: [
        {
          term: 'for instance',
          meaning: 'used to give an example',
          example: 'I like fruit, for instance apples.',
        },
      ],
      pronunciation: [],
      grammar_score: 78,
      fluency_score: 74,
      overall_score: 76,
    });
  }

  async evaluateSentence(
    _prompt: string,
    answer: string,
    _options?: ChatOptions,
  ): Promise<SentenceEvaluation> {
    const trimmed = answer.trim();
    const startsUpper = /^[A-ZÁÉÍÓÚÑ]/.test(trimmed);
    const endsPunctuated = /[.!?]$/.test(trimmed);
    const isCorrect = startsUpper && endsPunctuated;

    let corrected = trimmed;
    if (!startsUpper) corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    if (!endsPunctuated) corrected = `${corrected}.`;

    return SentenceEvaluationSchema.parse({
      corrected,
      betterVersion: corrected,
      explanation: isCorrect
        ? 'Great sentence — clear and well-formed!'
        : 'Remember to start with a capital letter and end with punctuation.',
      isCorrect,
      grammar_score: isCorrect ? 95 : 75,
      naturalness_score: 80,
      overall_score: isCorrect ? 90 : 78,
    });
  }

  /**
   * Deterministic mock vision. NO real image analysis and no network call: a stable
   * scene is chosen from a small catalogue by hashing the image reference, so the same
   * image always yields the same description (important for reproducible tests).
   */
  async describeImage(image: string, _options?: ChatOptions): Promise<ImageDescriptionResult> {
    const scenes: ImageDescriptionResult[] = [
      {
        description:
          'A busy city street at golden hour, with people walking past cafés and warm light on the buildings.',
        tags: ['city', 'street', 'people', 'café', 'sunset'],
      },
      {
        description:
          'A quiet beach with turquoise water, a few colorful umbrellas, and gentle waves reaching the sand.',
        tags: ['beach', 'ocean', 'umbrella', 'sand', 'waves'],
      },
      {
        description:
          'A cozy kitchen where someone is cooking; fresh vegetables and steam rise from a pan on the stove.',
        tags: ['kitchen', 'cooking', 'vegetables', 'stove', 'food'],
      },
      {
        description:
          'A green mountain trail winding through tall pine trees under a clear blue sky.',
        tags: ['mountain', 'trail', 'forest', 'trees', 'sky'],
      },
      {
        description:
          'A group of friends laughing together around a table in a bright, plant-filled room.',
        tags: ['friends', 'table', 'indoors', 'plants', 'laughing'],
      },
    ];
    let hash = 0;
    for (let i = 0; i < image.length; i++) hash = (hash * 31 + image.charCodeAt(i)) >>> 0;
    return scenes[hash % scenes.length]!;
  }

  async analyzeDebate(
    _motion: string,
    _userSide: 'FOR' | 'AGAINST',
    messages: ChatMessage[],
    _options?: ChatOptions,
  ): Promise<DebateFeedback> {
    const userTurns = messages.filter((m) => m.role === 'user');
    const totalWords = userTurns.reduce((n, m) => n + m.content.trim().split(/\s+/).length, 0);
    const avgWords = userTurns.length ? Math.round(totalWords / userTurns.length) : 0;
    const engaged = userTurns.length >= 2 && avgWords >= 12;

    return DebateFeedbackSchema.parse({
      summary: userTurns.length
        ? engaged
          ? 'You made a solid, well-developed case and engaged directly with the counter-arguments.'
          : 'A promising start — your points are clear but could be developed with more evidence.'
        : 'Make a few arguments first and I can score your debate.',
      strengths: userTurns.length
        ? ['Stated a clear position', 'Stayed on topic throughout']
        : [],
      improvements: engaged
        ? ['Add concrete examples or data to strengthen your claims']
        : ['Develop each point further', 'Directly rebut the opponent before adding new points'],
      argument_quality_score: engaged ? 82 : 68,
      persuasiveness_score: engaged ? 78 : 64,
      overall_score: engaged ? 80 : 66,
    });
  }

  /**
   * Deterministic open-ended exercise grading. NO network call: compares a normalised
   * version of the learner's answer against the expected answer, awarding partial credit
   * when the expected answer's keywords are present. The same input always yields the same
   * result (important for reproducible tests).
   */
  async evaluateExercise(
    _prompt: string,
    expected: string,
    answer: string,
    _options?: ChatOptions,
  ): Promise<ExerciseResult> {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    const a = normalize(answer);
    const e = normalize(expected);
    const exact = a === e;

    const expectedWords = e.split(' ').filter(Boolean);
    const answerWords = new Set(a.split(' ').filter(Boolean));
    const overlap = expectedWords.filter((w) => answerWords.has(w)).length;
    const ratio = expectedWords.length ? overlap / expectedWords.length : a.length ? 1 : 0;
    const isCorrect = exact || ratio >= 0.6;
    const score = exact ? 100 : Math.round(ratio * 100);

    return ExerciseResultSchema.parse({
      isCorrect,
      correctAnswer: expected,
      feedback: isCorrect
        ? 'Nicely done — your answer matches the target meaning.'
        : `Not quite. Compare your answer with the expected one and try again.`,
      score,
    });
  }

  /**
   * Deterministic learning-path generation. NO network call: filters the catalog to the
   * learner's language when known, sorts by level then title, and takes the first few as an
   * ordered plan. Only real catalog slugs are recommended.
   */
  async generateLearningPath(
    catalog: LearningPathCatalogItem[],
    options?: ChatOptions & { goal?: string },
  ): Promise<LearningPath> {
    const levelRank: Record<string, number> = {
      BEGINNER: 0,
      ELEMENTARY: 1,
      INTERMEDIATE: 2,
      UPPER_INTERMEDIATE: 3,
      ADVANCED: 4,
    };

    const relevant = options?.languageCode
      ? catalog.filter((c) => c.languageCode === options.languageCode)
      : [...catalog];
    const pool = relevant.length ? relevant : [...catalog];

    const ordered = [...pool].sort((x, y) => {
      const byLevel = (levelRank[x.level] ?? 0) - (levelRank[y.level] ?? 0);
      return byLevel !== 0 ? byLevel : x.title.localeCompare(y.title);
    });

    const steps = ordered.slice(0, 4).map((c, i) => ({
      courseSlug: c.slug,
      title: c.title,
      reason:
        i === 0
          ? 'Start here to build a solid foundation at your current level.'
          : `Continue with this ${c.level.toLowerCase().replace(/_/g, ' ')} course to keep progressing.`,
    }));

    const goalText = options?.goal ? ` toward your goal "${options.goal}"` : '';
    return LearningPathSchema.parse({
      summary: steps.length
        ? `A ${steps.length}-step plan${goalText} that builds your skills course by course.`
        : 'No courses are available yet to build a learning path.',
      steps,
    });
  }

  /**
   * Deterministic flashcard generation. NO network call: cards are derived from the topic
   * text itself (its words plus a stable set of learning-oriented templates), so the same
   * topic + count always yields the same deck. Output is schema-validated on return.
   */
  async generateFlashcards(
    topic: string,
    options?: ChatOptions & { count?: number },
  ): Promise<GeneratedFlashcardDeck> {
    const language = options?.languageName ?? 'the target language';
    const cleanTopic = topic.trim() || 'everyday vocabulary';
    const count = Math.min(Math.max(options?.count ?? 8, 1), 30);

    // A stable, hand-authored set of card *templates*. We rotate through them and key each
    // card off the topic so the deck is topic-flavoured yet fully deterministic (no RNG).
    const templates: Array<{ term: string; translation: string; example: string }> = [
      { term: 'hello', translation: 'a greeting', example: 'I say hello when I meet someone new.' },
      { term: 'please', translation: 'a polite request word', example: 'Could you help me, please?' },
      { term: 'thank you', translation: 'an expression of gratitude', example: 'Thank you for your help.' },
      { term: 'yes', translation: 'an affirmative answer', example: 'Yes, that sounds good.' },
      { term: 'no', translation: 'a negative answer', example: 'No, not today.' },
      { term: 'excuse me', translation: 'a phrase to get attention', example: 'Excuse me, where is the station?' },
      { term: 'how much', translation: 'a phrase to ask a price', example: 'How much is this?' },
      { term: 'where', translation: 'a word to ask about place', example: 'Where is the museum?' },
      { term: 'water', translation: 'a drink of clear liquid', example: 'Can I have some water?' },
      { term: 'help', translation: 'to give assistance', example: 'Can you help me?' },
      { term: 'today', translation: 'the current day', example: 'What are we doing today?' },
      { term: 'friend', translation: 'a person you like and trust', example: 'She is a good friend.' },
    ];

    const cards = Array.from({ length: count }, (_, i) => {
      const t = templates[i % templates.length]!;
      return {
        // Prefix the term with the topic so decks are distinguishable and topic-flavoured.
        term: `${cleanTopic}: ${t.term}`,
        translation: t.translation,
        example: t.example,
      };
    });

    return GeneratedFlashcardDeckSchema.parse({
      title: `${cleanTopic} flashcards`,
      description: `A ${count}-card ${language} deck about ${cleanTopic}.`,
      cards,
    });
  }
}

export class MockSttProvider implements SpeechToTextProvider {
  readonly name = 'mock';
  async transcribe(_audio: ArrayBuffer, _languageCode?: string): Promise<SpeechToTextResult> {
    return { text: '(mock transcription)', confidence: 0.9 };
  }
}

export class MockTtsProvider implements TextToSpeechProvider {
  readonly name = 'mock';
  async synthesize(_text: string, _languageCode?: string): Promise<TextToSpeechResult> {
    return { audio: new ArrayBuffer(0), mimeType: 'audio/mpeg' };
  }
}
