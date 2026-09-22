import {
  AIFeedbackSchema,
  SentenceEvaluationSchema,
  type AIFeedback,
  type SentenceEvaluation,
} from '@vaani/types';
import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResult,
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
