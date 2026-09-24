import { describe, expect, it } from 'vitest';
import { UNASSIGNED_OWNER } from '@vaani/types';
import {
  MockMeetingAnalysisProvider,
  type AnalyzeInput,
  type KnownParticipant,
} from '../src/index.js';

const analyzer = new MockMeetingAnalysisProvider();

function baseInput(overrides: Partial<AnalyzeInput> = {}): AnalyzeInput {
  return { meetingTitle: 'Weekly sync', knownParticipants: [], segments: [], ...overrides };
}

describe('Questions + Important Topics — no fabrication (CLAUDE.md §15)', () => {
  it('extracts a structured question from an explicit QUESTION cue, Unassigned when the speaker is unknown', async () => {
    const result = await analyzer.analyze(
      baseInput({
        segments: [
          { speakerLabel: 'Speaker 1', text: 'QUESTION: do we have sign-off from security?', startMs: 0, endMs: 1 },
        ],
      }),
    );
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]!.text).toBe('do we have sign-off from security?');
    expect(result.questions[0]!.askedBy).toBe(UNASSIGNED_OWNER);
    expect(result.questions[0]!.answered).toBe(false);
  });

  it('attributes askedBy ONLY when the speaker maps to a known participant', async () => {
    const known: KnownParticipant[] = [
      { id: 'p1', name: 'Priya', email: null, role: null, speakerLabel: 'Speaker 1' },
    ];
    const result = await analyzer.analyze(
      baseInput({
        knownParticipants: known,
        segments: [{ speakerLabel: 'Speaker 1', text: 'Are we on track?', startMs: 0, endMs: 1 }],
      }),
    );
    expect(result.questions[0]!.askedBy).toBe('Priya');
  });

  it('produces NO topics when the transcript surfaced no structured items', async () => {
    const result = await analyzer.analyze(
      baseInput({
        segments: [{ speakerLabel: 'Speaker 1', text: 'Hi.', startMs: 0, endMs: 1 }],
      }),
    );
    expect(result.summary.importantTopics).toEqual([]);
  });

  it('derives topics strictly from extracted decisions/actions/risks/questions (deduped)', async () => {
    const result = await analyzer.analyze(
      baseInput({
        segments: [
          { speakerLabel: 'Speaker 1', text: 'DECISION: ship the beta next Friday', startMs: 0, endMs: 1 },
          { speakerLabel: 'Speaker 1', text: 'RISK: payment integration is unstable', startMs: 1, endMs: 2 },
          { speakerLabel: 'Speaker 1', text: 'DECISION: ship the beta next Friday', startMs: 2, endMs: 3 },
        ],
      }),
    );
    // Two DECISION lines are identical → one topic; plus the RISK topic.
    expect(result.summary.importantTopics.length).toBeGreaterThan(0);
    expect(new Set(result.summary.importantTopics).size).toBe(result.summary.importantTopics.length);
  });
});
