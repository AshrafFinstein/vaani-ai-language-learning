import {
  AIFeedbackSchema,
  DebateFeedbackSchema,
  SentenceEvaluationSchema,
  type AIFeedback,
  type DebateFeedback,
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
