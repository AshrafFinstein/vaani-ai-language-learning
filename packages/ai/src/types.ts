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
  /** Human-readable language name for prompts, e.g. "Spanish". */
  languageName?: string;
  /** Optional conversation topic/scenario hint. */
  topic?: string;
}

export interface ChatResult {
  reply: string;
}

/**
 * The core AI abstraction. Feature code depends ONLY on this interface, never on a
 * concrete vendor SDK, so providers are swappable via configuration.
 */
export interface AIProvider {
  readonly name: string;
  /** Single-shot reply (non-streaming). */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  /** Async iterator of text deltas for streaming UIs. */
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
  /** Structured tutor feedback for a conversation — always schema-validated. */
  analyze(messages: ChatMessage[], options?: ChatOptions): Promise<AIFeedback>;
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
