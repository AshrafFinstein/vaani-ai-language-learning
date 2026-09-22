import { AIFeedbackSchema } from '@vaani/types';
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

  private buildReply(messages: ChatMessage[]): string {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const text = lastUser?.content.trim() ?? '';
    if (!text) return 'Hello! What would you like to practice today?';
    return `That's a great point about "${text.slice(0, 60)}". Can you tell me a little more?`;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    const reply = this.buildReply(messages);
    if (!options?.structured) return { reply };

    // Validate through the real schema so the mock exercises the same trust boundary.
    const feedback = AIFeedbackSchema.parse({
      reply,
      corrections: [],
      vocabulary: [],
      pronunciation: [],
      grammar_score: 82,
      fluency_score: 78,
      overall_score: 80,
    });
    return { reply, feedback };
  }

  async *streamChat(messages: ChatMessage[]): AsyncIterable<string> {
    const reply = this.buildReply(messages);
    for (const word of reply.split(' ')) {
      yield `${word} `;
    }
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
