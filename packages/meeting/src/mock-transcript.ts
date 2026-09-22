import type {
  KnownParticipant,
  MeetingTranscriptProvider,
  TranscriptSegmentInput,
} from './types.js';

/**
 * Deterministic, offline transcript generator for the MOCK meeting pipeline.
 * It does NOT capture real audio — it simply fabricates a plausible transcript
 * so downstream analysis has something to work on during the prototype phase.
 *
 * Speaker labels are mapped onto the meeting's known participants where possible
 * so the analyzer never has to invent a person. When there are no participants,
 * generic "Speaker 1/2" labels are used and the analyzer will fall back to the
 * `Unassigned` owner sentinel.
 */
export class MockMeetingTranscriptProvider implements MeetingTranscriptProvider {
  readonly name = 'mock';

  async generate(input: {
    meetingTitle: string;
    knownParticipants: KnownParticipant[];
  }): Promise<{ segments: TranscriptSegmentInput[]; language: string }> {
    const speakerA = input.knownParticipants[0]?.speakerLabel ?? 'Speaker 1';
    const speakerB = input.knownParticipants[1]?.speakerLabel ?? 'Speaker 2';

    // Note: some lines deliberately state an owner + due date ("ACTION: ... — <name> by <date>"),
    // and others deliberately do NOT, so the analyzer's sentinel behaviour is exercised.
    const lines: Array<[string, string]> = [
      [speakerA, `Thanks everyone for joining the ${input.meetingTitle}. Let's get started.`],
      [speakerB, 'Sounds good. First item is the release timeline — we need to lock it today.'],
      [speakerA, 'DECISION: we will ship the beta next Friday. That is agreed.'],
      [speakerB, 'RISK: the payment integration is still unstable and could slip.'],
      [speakerA, `ACTION: prepare the release notes — ${owner(input, 0)} by 2026-10-01.`],
      [speakerB, 'ACTION: investigate the flaky payment tests.'],
      [speakerA, 'QUESTION: do we have sign-off from security yet?'],
      [speakerB, 'Not yet, I will chase them. Anything else to cover?'],
      [speakerA, 'That covers it. Next step is to sync again on Monday.'],
    ];

    const segmentMs = 12_000;
    const segments: TranscriptSegmentInput[] = lines.map(([speakerLabel, text], i) => ({
      speakerLabel,
      text,
      startMs: i * segmentMs,
      endMs: (i + 1) * segmentMs,
    }));

    return { segments, language: 'en' };
  }
}

/** Names participant 0 when present so the transcript owner is a real attendee, else empty. */
function owner(
  input: { knownParticipants: KnownParticipant[] },
  index: number,
): string {
  return input.knownParticipants[index]?.name ?? 'the team';
}
