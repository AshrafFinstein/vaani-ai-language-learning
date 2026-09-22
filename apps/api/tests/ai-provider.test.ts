import { describe, expect, it } from 'vitest';
import { MockAIProvider, parseFeedback, createAIProvider } from '@vaani/ai';

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

describe('createAIProvider', () => {
  it('defaults to the mock provider when unset', () => {
    expect(createAIProvider({}).name).toBe('mock');
  });

  it('throws for openai without an API key', () => {
    expect(() => createAIProvider({ provider: 'openai' })).toThrow(/API key/i);
  });
});
