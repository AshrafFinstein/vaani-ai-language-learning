import { describe, expect, it } from 'vitest';
import {
  MockAIProvider,
  parseFeedback,
  createAIProvider,
  buildRoleplayPrompt,
} from '@vaani/ai';
import { ROLEPLAY_SCENARIOS } from '@vaani/types';

describe('MockAIProvider', () => {
  const provider = new MockAIProvider();
  const history = [
    { role: 'user' as const, content: 'Hello there' },
    { role: 'assistant' as const, content: 'Hi!' },
    { role: 'user' as const, content: 'I went to the market yesterday' },
  ];

  it('returns a non-empty reply', async () => {
    const { reply } = await provider.chat(history, { level: 'INTERMEDIATE', languageName: 'Spanish' });
    expect(reply.length).toBeGreaterThan(0);
  });

  it('streams deltas that reconstruct a reply', async () => {
    let streamed = '';
    for await (const delta of provider.streamChat(history)) streamed += delta;
    expect(streamed.trim().length).toBeGreaterThan(0);
  });

  it('produces schema-valid feedback with bounded scores', async () => {
    const feedback = await provider.analyze(history, { level: 'INTERMEDIATE' });
    expect(feedback.reply).toBeTruthy();
    for (const score of [feedback.grammar_score, feedback.fluency_score, feedback.overall_score]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('parseFeedback', () => {
  it('parses fenced JSON and validates it', () => {
    const raw = '```json\n{"reply":"Good job","grammar_score":90}\n```';
    const fb = parseFeedback(raw);
    expect(fb.reply).toBe('Good job');
    expect(fb.grammar_score).toBe(90);
    expect(fb.corrections).toEqual([]); // schema default
  });

  it('never throws on garbage output', () => {
    const fb = parseFeedback('not json at all');
    expect(fb.reply).toBeTruthy();
    expect(fb.overall_score).toBe(0);
  });
});

describe('MockAIProvider.evaluateSentence', () => {
  const provider = new MockAIProvider();

  it('flags a lowercase, unpunctuated sentence and fixes it', async () => {
    const evaluation = await provider.evaluateSentence('Tell me about your day.', 'i went to work');
    expect(evaluation.isCorrect).toBe(false);
    expect(evaluation.corrected).toBe('I went to work.');
    expect(evaluation.overall_score).toBeGreaterThanOrEqual(0);
    expect(evaluation.overall_score).toBeLessThanOrEqual(100);
  });

  it('accepts a well-formed sentence', async () => {
    const evaluation = await provider.evaluateSentence('Tell me about your day.', 'I went to work.');
    expect(evaluation.isCorrect).toBe(true);
  });
});

describe('buildRoleplayPrompt', () => {
  it('embeds the scenario role and language', () => {
    const scenario = ROLEPLAY_SCENARIOS[0]!;
    const prompt = buildRoleplayPrompt(scenario, { languageName: 'Spanish', level: 'BEGINNER' });
    expect(prompt).toContain(scenario.aiRole);
    expect(prompt).toContain('Spanish');
  });
});

describe('createAIProvider', () => {
  it('defaults to the mock provider when unset', () => {
    expect(createAIProvider({}).name).toBe('mock');
  });

  it('throws for openai without an API key', () => {
    expect(() => createAIProvider({ provider: 'openai' })).toThrow(/API key/i);
  });
});
