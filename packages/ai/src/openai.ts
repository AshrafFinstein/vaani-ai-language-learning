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
} from './types.js';
import {
  buildDebateFeedbackPrompt,
  buildExerciseEvalPrompt,
  buildFeedbackPrompt,
  buildFlashcardPrompt,
  buildLearningPathPrompt,
  buildSentenceEvalPrompt,
  buildSystemPrompt,
} from './prompt.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

interface OpenAIChoiceMessage {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>;
}

/**
 * OpenAI-compatible provider. Works against any endpoint that implements the
 * `/chat/completions` API (OpenAI, Azure OpenAI, local gateways, etc.). Because it
 * implements {@link AIProvider}, swapping vendors requires only env/config changes.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAIProvider requires an API key (set OPENAI_API_KEY on the backend).');
    }
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = config.model ?? 'gpt-4o-mini';
  }

  private withSystem(messages: ChatMessage[], system: string): ChatMessage[] {
    // Prepend the system prompt unless the caller already supplied one.
    return messages[0]?.role === 'system'
      ? messages
      : [{ role: 'system', content: system }, ...messages];
  }

  private async call(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, ...body }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    return res;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    const res = await this.call({
      messages: this.withSystem(messages, options?.systemPrompt ?? buildSystemPrompt(options)),
      temperature: 0.7,
    });
    const data = (await res.json()) as OpenAIChoiceMessage;
    return { reply: data.choices?.[0]?.message?.content?.trim() ?? '' };
  }

  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const res = await this.call({
      messages: this.withSystem(messages, options?.systemPrompt ?? buildSystemPrompt(options)),
      temperature: 0.7,
      stream: true,
    });
    if (!res.body) throw new Error('OpenAI streaming response has no body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by newlines; each data line holds a JSON chunk.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload) as OpenAIChoiceMessage;
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Ignore keep-alives / partial frames.
        }
      }
    }
  }

  async analyze(messages: ChatMessage[], options?: ChatOptions): Promise<AIFeedback> {
    const res = await this.call({
      messages: [
        { role: 'system', content: buildFeedbackPrompt(options) },
        ...messages.filter((m) => m.role !== 'system'),
        { role: 'user', content: 'Provide my feedback as JSON now.' },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    const data = (await res.json()) as OpenAIChoiceMessage;
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    return parseFeedback(raw);
  }

  async evaluateSentence(
    prompt: string,
    answer: string,
    options?: ChatOptions,
  ): Promise<SentenceEvaluation> {
    const res = await this.call({
      messages: [
        { role: 'system', content: buildSentenceEvalPrompt(prompt, options) },
        { role: 'user', content: answer },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    const data = (await res.json()) as OpenAIChoiceMessage;
    return parseJson(data.choices?.[0]?.message?.content ?? '{}', (obj) => {
      if (typeof obj.corrected !== 'string') obj.corrected = answer;
      if (typeof obj.betterVersion !== 'string') obj.betterVersion = String(obj.corrected ?? answer);
      if (typeof obj.explanation !== 'string') obj.explanation = '';
      return SentenceEvaluationSchema.parse(obj);
    });
  }

  async describeImage(image: string, _options?: ChatOptions): Promise<ImageDescriptionResult> {
    // Uses the OpenAI-compatible multimodal message format (image_url accepts data-URLs).
    const res = await this.call({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in one or two sentences, then list 3-6 salient tags. Return ONLY JSON: {"description": string, "tags": string[]}.',
            },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ] as unknown as ChatMessage[],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    const data = (await res.json()) as OpenAIChoiceMessage;
    return parseJson(data.choices?.[0]?.message?.content ?? '{}', (obj) => ({
      description: typeof obj.description === 'string' ? obj.description : 'An image.',
      tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
    }));
  }

  async analyzeDebate(
    motion: string,
    userSide: 'FOR' | 'AGAINST',
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<DebateFeedback> {
    const res = await this.call({
      messages: [
        { role: 'system', content: buildDebateFeedbackPrompt(motion, userSide, options) },
        ...messages.filter((m) => m.role !== 'system'),
        { role: 'user', content: 'Provide my debate feedback as JSON now.' },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    const data = (await res.json()) as OpenAIChoiceMessage;
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    return parseDebateFeedback(raw);
  }

  async evaluateExercise(
    prompt: string,
    expected: string,
    answer: string,
    options?: ChatOptions,
  ): Promise<ExerciseResult> {
    const res = await this.call({
      messages: [
        { role: 'system', content: buildExerciseEvalPrompt(prompt, expected, options) },
        { role: 'user', content: answer },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    const data = (await res.json()) as OpenAIChoiceMessage;
    return parseJson(data.choices?.[0]?.message?.content ?? '{}', (obj) => {
      if (typeof obj.correctAnswer !== 'string') obj.correctAnswer = expected;
      if (typeof obj.feedback !== 'string') obj.feedback = '';
      return ExerciseResultSchema.parse(obj);
    });
  }

  async generateLearningPath(
    catalog: LearningPathCatalogItem[],
    options?: ChatOptions & { goal?: string },
  ): Promise<LearningPath> {
    const res = await this.call({
      messages: [
        { role: 'system', content: buildLearningPathPrompt(catalog, options) },
        { role: 'user', content: 'Generate my learning path as JSON now.' },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    const data = (await res.json()) as OpenAIChoiceMessage;
    const allowed = new Set(catalog.map((c) => c.slug));
    return parseJson(data.choices?.[0]?.message?.content ?? '{}', (obj) => {
      const parsed = LearningPathSchema.parse(obj);
      // Defensively drop any step the model invented that isn't in the real catalog.
      return { ...parsed, steps: parsed.steps.filter((s) => allowed.has(s.courseSlug)) };
    });
  }

  async generateFlashcards(
    topic: string,
    options?: ChatOptions & { count?: number },
  ): Promise<GeneratedFlashcardDeck> {
    const res = await this.call({
      messages: [
        { role: 'system', content: buildFlashcardPrompt(topic, options) },
        { role: 'user', content: 'Generate the flashcard deck as JSON now.' },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    const data = (await res.json()) as OpenAIChoiceMessage;
    return parseJson(data.choices?.[0]?.message?.content ?? '{}', (obj) => {
      if (typeof obj.title !== 'string' || !obj.title) obj.title = `${topic} flashcards`;
      if (typeof obj.description !== 'string') obj.description = '';
      // Drop malformed card entries defensively before schema validation.
      if (Array.isArray(obj.cards)) {
        obj.cards = obj.cards.filter(
          (c): c is Record<string, unknown> =>
            Boolean(c) &&
            typeof c === 'object' &&
            typeof (c as Record<string, unknown>).term === 'string' &&
            typeof (c as Record<string, unknown>).translation === 'string',
        );
      }
      return GeneratedFlashcardDeckSchema.parse(obj);
    });
  }
}

/** Parses model JSON output defensively, then hands the object to a validator. */
function parseJson<T>(raw: string, validate: (obj: Record<string, unknown>) => T): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  return validate(obj);
}

/** Extracts and validates AIFeedback JSON from a model response (never trust raw output). */
export function parseFeedback(raw: string): AIFeedback {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fall back to the first {...} block if the model added stray text.
    const match = cleaned.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }
  // Guarantee the required `reply` field so a terse model response never throws.
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  if (typeof obj.reply !== 'string') obj.reply = 'Here is some feedback on your conversation.';
  // Coerce/validate; schema defaults fill any remaining fields.
  return AIFeedbackSchema.parse(obj);
}

/** Extracts and validates DebateFeedback JSON from a model response (never trust raw output). */
export function parseDebateFeedback(raw: string): DebateFeedback {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  if (typeof obj.summary !== 'string') obj.summary = 'Here is some feedback on your debate.';
  return DebateFeedbackSchema.parse(obj);
}
