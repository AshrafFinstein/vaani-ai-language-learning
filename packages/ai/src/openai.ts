import type { AIProvider, ChatMessage, ChatOptions, ChatResult } from './types.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/**
 * OpenAI-compatible provider. Intentionally a stub in Phase 1: the interface and
 * wiring exist, but the network implementation is added in the AI Chat phase.
 * Because it implements {@link AIProvider}, swapping it in later requires no changes
 * to feature code — only the factory/env selection.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  constructor(private readonly config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAIProvider requires an API key (set OPENAI_API_KEY on the backend).');
    }
  }

  async chat(_messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResult> {
    // TODO(phase-3): POST to `${this.config.baseUrl}/chat/completions`, then validate
    // structured output with AIFeedbackSchema before returning. Never trust raw output.
    throw new Error(
      `OpenAIProvider.chat is not implemented yet (base: ${this.config.baseUrl ?? 'default'}).`,
    );
  }

  async *streamChat(_messages: ChatMessage[], _options?: ChatOptions): AsyncIterable<string> {
    throw new Error('OpenAIProvider.streamChat is not implemented until the AI Chat phase.');
  }
}
