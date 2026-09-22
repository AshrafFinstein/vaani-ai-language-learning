import type {
  AIFeedback,
  DebateFeedback,
  ExerciseResult,
  LearningLevel,
  LearningPath,
  LearningPathCatalogItem,
  SentenceEvaluation,
} from '@vaani/types';

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
  /**
   * Full system prompt override (e.g. a roleplay/dialogue scenario). When set,
   * providers use it verbatim instead of the default tutor prompt.
   */
  systemPrompt?: string;
}

export interface ChatResult {
  reply: string;
}

/** Result of a (mock) vision description for Photo mode. */
export interface ImageDescriptionResult {
  /** A natural-language description of the image the AI can converse about. */
  description: string;
  /** Salient objects/subjects detected — deterministic in the mock. */
  tags: string[];
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
  /** Structured evaluation of one learner sentence — always schema-validated. */
  evaluateSentence(
    prompt: string,
    answer: string,
    options?: ChatOptions,
  ): Promise<SentenceEvaluation>;
  /**
   * Vision: describe an image so the AI can converse about it (Photo mode). The
   * argument is an image reference (data-URL or http(s) URL). The Mock returns a
   * deterministic description — NO real image analysis or network call.
   */
  describeImage(image: string, options?: ChatOptions): Promise<ImageDescriptionResult>;
  /** Structured debate scoring/feedback — always schema-validated (Debate mode). */
  analyzeDebate(
    motion: string,
    userSide: 'FOR' | 'AGAINST',
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<DebateFeedback>;
  /**
   * Grades one open-ended course exercise (translate / free-response) against an expected
   * answer — always schema-validated (Course mode). Deterministic exercise kinds are graded
   * by the service without the AI; this handles answers that need judgement.
   */
  evaluateExercise(
    prompt: string,
    expected: string,
    answer: string,
    options?: ChatOptions,
  ): Promise<ExerciseResult>;
  /**
   * Generates a personalized learning path from the learner's level/goal and the available
   * course catalog — always schema-validated (Course mode). The Mock is deterministic and
   * makes NO network call. Recommendations reference only catalog slugs.
   */
  generateLearningPath(
    catalog: LearningPathCatalogItem[],
    options?: ChatOptions & { goal?: string },
  ): Promise<LearningPath>;
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
