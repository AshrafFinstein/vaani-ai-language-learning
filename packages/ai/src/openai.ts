import {
  AIFeedbackSchema,
  DailyFeedbackDTO,
  DebateFeedbackSchema,
  ExerciseResultSchema,
  GeneratedFlashcardDeckSchema,
  LearningPathSchema,
  SentenceEvaluationSchema,
  type AIFeedback,
  type DailyFeedbackDTO as DailyFeedback,
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
  ProgressSnapshot,
} from './types.js';
import {
  buildDebateFeedbackPrompt,
  buildExerciseEvalPrompt,
  buildFeedbackPrompt,
  buildFlashcardPrompt,
  buildLearningPathPrompt,
  buildProgressSummaryPrompt,
  buildSentenceEvalPrompt,
  buildSystemPrompt,
} from './prompt.js';
import { fetchWithRetry, ProviderHttpError, type HttpHardeningOptions } from './http.js';
import { MockAIProvider } from './mock.js';

export interface OpenAIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  /** Chat model, e.g. "gpt-4o" / "gpt-4o-mini". Defaults to "gpt-4o-mini". */
  model?: string;
  /**
   * When true, a transient OpenAI failure (timeout / 429 / 5xx / network) degrades
   * to the deterministic Mock provider instead of throwing, so an outage does not
   * 500 the whole request. Opt-in (env `AI_FALLBACK_TO_MOCK=true`).
   */
  fallbackToMock?: boolean;
  /** Timeout/retry tuning shared with the real speech providers. */
  hardening?: HttpHardeningOptions;
}

interface OpenAIChoiceMessage {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>;
}

/**
 * OpenAI-compatible provider. Works against any endpoint that implements the
 * `/chat/completions` API (OpenAI, Azure OpenAI, local gateways, etc.). Because it
 * implements {@link AIProvider}, swapping vendors requires only env/config changes.
 *
 * Hardening: every request runs through {@link fetchWithRetry} — a per-attempt
 * timeout (AbortController) plus bounded exponential-backoff retries on 429/5xx and
 * network errors. Failures surface as a typed {@link ProviderHttpError}. When
 * `fallbackToMock` is set, structured methods degrade to the Mock provider instead
 * of throwing.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly hardening?: HttpHardeningOptions;
  private readonly mock?: MockAIProvider;

  constructor(private readonly config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAIProvider requires an API key (set OPENAI_API_KEY on the backend).');
    }
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = config.model ?? 'gpt-4o-mini';
    this.hardening = config.hardening;
    // Only construct the mock when graceful fallback is enabled (keeps hot path lean).
    this.mock = config.fallbackToMock ? new MockAIProvider() : undefined;
  }

  private withSystem(messages: ChatMessage[], system: string): ChatMessage[] {
    // Prepend the system prompt unless the caller already supplied one.
    return messages[0]?.role === 'system'
      ? messages
      : [{ role: 'system', content: system }, ...messages];
  }

  /**
   * Runs `op`; if it throws a transient {@link ProviderHttpError} AND fallback is
   * enabled, degrades to the Mock provider via `mockOp`. Non-provider errors and
   * non-retryable HTTP errors (e.g. 401 bad key) still surface so misconfiguration
   * is loud rather than silently masked.
   */
  private async withFallback<T>(op: () => Promise<T>, mockOp: (m: MockAIProvider) => Promise<T>): Promise<T> {
    try {
      return await op();
    } catch (err) {
      if (this.mock && err instanceof ProviderHttpError && err.retryable) {
        return mockOp(this.mock);
      }
      throw err;
    }
  }

  private async call(body: Record<string, unknown>): Promise<Response> {
    return fetchWithRetry(
      'OpenAI',
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, ...body }),
      },
      this.hardening,
    );
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    return this.withFallback(
      async () => {
        const res = await this.call({
          messages: this.withSystem(messages, options?.systemPrompt ?? buildSystemPrompt(options)),
          temperature: 0.7,
        });
        const data = (await res.json()) as OpenAIChoiceMessage;
        return { reply: data.choices?.[0]?.message?.content?.trim() ?? '' };
      },
      (m) => m.chat(messages, options),
    );
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
    return this.withFallback(
      async () => {
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
      },
      (m) => m.analyze(messages, options),
    );
  }

  async evaluateSentence(
    prompt: string,
    answer: string,
    options?: ChatOptions,
  ): Promise<SentenceEvaluation> {
    return this.withFallback(
      async () => {
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
          if (typeof obj.betterVersion !== 'string')
            obj.betterVersion = String(obj.corrected ?? answer);
          if (typeof obj.explanation !== 'string') obj.explanation = '';
          return SentenceEvaluationSchema.parse(obj);
        });
      },
      (m) => m.evaluateSentence(prompt, answer, options),
    );
  }

  async describeImage(image: string, options?: ChatOptions): Promise<ImageDescriptionResult> {
    return this.withFallback(
      async () => {
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
      },
      (m) => m.describeImage(image, options),
    );
  }

  async analyzeDebate(
    motion: string,
    userSide: 'FOR' | 'AGAINST',
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<DebateFeedback> {
    return this.withFallback(
      async () => {
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
      },
      (m) => m.analyzeDebate(motion, userSide, messages, options),
    );
  }

  async evaluateExercise(
    prompt: string,
    expected: string,
    answer: string,
    options?: ChatOptions,
  ): Promise<ExerciseResult> {
    return this.withFallback(
      async () => {
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
      },
      (m) => m.evaluateExercise(prompt, expected, answer, options),
    );
  }

  async generateLearningPath(
    catalog: LearningPathCatalogItem[],
    options?: ChatOptions & { goal?: string },
  ): Promise<LearningPath> {
    return this.withFallback(
      async () => {
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
      },
      (m) => m.generateLearningPath(catalog, options),
    );
  }

  async generateFlashcards(
    topic: string,
    options?: ChatOptions & { count?: number },
  ): Promise<GeneratedFlashcardDeck> {
    return this.withFallback(
      async () => {
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
      },
      (m) => m.generateFlashcards(topic, options),
    );
  }

  async summarizeProgress(snapshot: ProgressSnapshot, options?: ChatOptions): Promise<DailyFeedback> {
    return this.withFallback(
      async () => {
        const res = await this.call({
          messages: [
            { role: 'system', content: buildProgressSummaryPrompt(snapshot, options) },
            { role: 'user', content: 'Write my daily feedback as JSON now.' },
          ],
          temperature: 0.4,
          response_format: { type: 'json_object' },
        });
        const data = (await res.json()) as OpenAIChoiceMessage;
        return parseJson(data.choices?.[0]?.message?.content ?? '{}', (obj) => {
          if (typeof obj.summary !== 'string')
            obj.summary = 'Here is a summary of your recent progress.';
          if (!Array.isArray(obj.highlights)) obj.highlights = [];
          if (!Array.isArray(obj.suggestions)) obj.suggestions = [];
          if (typeof obj.hasActivity !== 'boolean') obj.hasActivity = snapshot.totalSessions > 0;
          return DailyFeedbackDTO.parse(obj);
        });
      },
      (m) => m.summarizeProgress(snapshot, options),
    );
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
