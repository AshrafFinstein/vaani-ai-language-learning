import type { AIFeedback, LearningLevel } from '@vaani/types';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  /** Learner proficiency; providers adapt tone/complexity accordingly. */
  level?: LearningLevel;
  /** Target learning language code, e.g. "en", "es". */
  languageCode?: string;
  /** Optional conversation topic/scenario hint. */
  topic?: string;
  /** When true, ask the provider to return structured {@link AIFeedback}. */
  structured?: boolean;
}

export interface ChatResult {
  reply: string;
  /** Present only when structured feedback was requested and validated. */
  feedback?: AIFeedback;
}

/**
 * The core AI abstraction. Feature code depends ONLY on this interface, never on a
 * concrete vendor SDK, so providers are swappable via configuration.
 */
export interface AIProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  /** Async iterator of token/though deltas for streaming UIs. */
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
}

export interface SpeechToTextProvider {
  readonly name: string;
  transcribe(audio: ArrayBuffer, languageCode?: string): Promise<SpeechToTextResult>;
}

export interface TextToSpeechResult {
  audio: ArrayBuffer;
  mimeType: string;
}

export interface TextToSpeechProvider {
  readonly name: string;
  synthesize(text: string, languageCode?: string): Promise<TextToSpeechResult>;
}
