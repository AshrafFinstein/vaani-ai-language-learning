import { describe, expect, it } from 'vitest';
import { UNASSIGNED_OWNER, UNSPECIFIED_DUE_DATE } from '@vaani/types';
import {
  MockMeetingAnalysisProvider,
  MockMeetingTranscriptProvider,
  type AnalyzeInput,
  type KnownParticipant,
} from '../src/index.js';

const analyzer = new MockMeetingAnalysisProvider();

function baseInput(overrides: Partial<AnalyzeInput> = {}): AnalyzeInput {
  return {
    meetingTitle: 'Weekly sync',
    knownParticipants: [],
    segments: [],
    ...overrides,
  };
}

describe('MockMeetingAnalysisProvider — never fabricates data (CLAUDE.md §15)', () => {
  it('uses the Unassigned / Not specified sentinels when the transcript names no owner or date', async () => {
    const input = baseInput({
      segments: [
        { speakerLabel: 'Speaker 1', text: 'ACTION: investigate the flaky payment tests.', startMs: 0, endMs: 1000 },
      ],
    });

    const result = await analyzer.analyze(input);

    expect(result.actionItems).toHaveLength(1);
    expect(result.actionItems[0]!.owner).toBe(UNASSIGNED_OWNER);
    expect(result.actionItems[0]!.dueDate).toBe(UNSPECIFIED_DUE_DATE);
  });

  it('does not invent an owner even when a name-like word is present but is not a known participant', async () => {
    const input = baseInput({
      segments: [
        { speakerLabel: 'Speaker 1', text: 'ACTION: ask Jordan to review the deck.', startMs: 0, endMs: 1000 },
      ],
    });

    const result = await analyzer.analyze(input);

    // "Jordan" is not a scheduled participant, so it must NOT become the owner.
    expect(result.actionItems[0]!.owner).toBe(UNASSIGNED_OWNER);
  });

  it('attributes an owner ONLY when the line names a known participant', async () => {
    const known: KnownParticipant[] = [
      { id: 'p1', name: 'Priya', email: null, role: null, speakerLabel: 'Speaker 1' },
    ];
    const input = baseInput({
      knownParticipants: known,
      segments: [
        { speakerLabel: 'Speaker 1', text: 'ACTION: prepare the release notes — Priya by 2026-10-01.', startMs: 0, endMs: 1000 },
      ],
    });

    const result = await analyzer.analyze(input);

    expect(result.actionItems[0]!.owner).toBe('Priya');
    expect(result.actionItems[0]!.dueDate).toBe('2026-10-01');
  });

  it('never adds participants beyond the known roster + speakers that actually appear', async () => {
    const known: KnownParticipant[] = [
      { id: 'p1', name: 'Priya', email: null, role: null, speakerLabel: 'Speaker 1' },
    ];
    const input = baseInput({
      knownParticipants: known,
      segments: [
        { speakerLabel: 'Speaker 1', text: 'Hello everyone.', startMs: 0, endMs: 1000 },
        { speakerLabel: 'Speaker 2', text: 'Thanks for joining.', startMs: 1000, endMs: 2000 },
      ],
    });

    const result = await analyzer.analyze(input);

    // Priya (known) + the raw "Speaker 2" label. No invented names.
    expect(result.participants.map((p) => p.name).sort()).toEqual(['Priya', 'Speaker 2']);
    const speaker2 = result.participants.find((p) => p.speakerLabel === 'Speaker 2')!;
    expect(speaker2.email).toBeNull();
    expect(speaker2.role).toBeNull();
  });

  it('leaves decisions Unassigned when the speaker maps to no known participant', async () => {
    const input = baseInput({
      segments: [
        { speakerLabel: 'Speaker 1', text: 'DECISION: we will ship the beta next Friday.', startMs: 0, endMs: 1000 },
      ],
    });

    const result = await analyzer.analyze(input);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]!.decidedBy).toBe(UNASSIGNED_OWNER);
  });

  it('produces a schema-shaped bundle from the mock transcript without inventing owners', async () => {
    const transcript = await new MockMeetingTranscriptProvider().generate({
      meetingTitle: 'Weekly sync',
      knownParticipants: [],
    });
    const result = await analyzer.analyze({
      meetingTitle: 'Weekly sync',
      knownParticipants: [],
      segments: transcript.segments,
    });

    // With no known participants, every action owner must be Unassigned.
    for (const item of result.actionItems) {
      expect(item.owner).toBe(UNASSIGNED_OWNER);
    }
    expect(result.summary.risks.length).toBeGreaterThan(0);
    expect(result.summary.questions.length).toBeGreaterThan(0);
  });
});
