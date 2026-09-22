import {
  UNASSIGNED_OWNER,
  UNSPECIFIED_DUE_DATE,
  type ActionItemDTO,
  type DecisionDTO,
  type MeetingAnalysisDTO,
  type MeetingSummaryDTO,
  type ParticipantDTO,
} from '@vaani/types';
import type { AnalyzeInput, MeetingAnalysisProvider, TranscriptSegmentInput } from './types.js';

/**
 * Deterministic, offline analyzer for the MOCK meeting pipeline. It converts a
 * speaker-labelled transcript into a schema-valid analysis bundle.
 *
 * CLAUDE.md §15 — the analyzer NEVER fabricates data:
 *   - Participants are ONLY those supplied at schedule time (or a speaker that
 *     actually appears in the transcript). No person is invented.
 *   - An action item's owner is taken ONLY from the transcript line; when the
 *     line does not name a known participant, the owner is {@link UNASSIGNED_OWNER}.
 *   - A due date is parsed ONLY from an explicit date in the line; otherwise it
 *     is {@link UNSPECIFIED_DUE_DATE}.
 *   - Decisions/action-items/risks/questions are derived strictly from explicit
 *     cue markers or keywords in the transcript text — nothing is imagined.
 */
export class MockMeetingAnalysisProvider implements MeetingAnalysisProvider {
  readonly name = 'mock';

  async analyze(input: AnalyzeInput): Promise<MeetingAnalysisDTO> {
    const { segments, knownParticipants } = input;

    // Resolve the roster the analyzer is allowed to reference. Start from the
    // participants supplied at schedule time; only speakers that genuinely occur
    // in the transcript may be added — never anyone else.
    const participants = resolveParticipants(input);

    // Speaker labels that map to a *scheduled* (named) participant. A decision is
    // only attributed to a person here — a bare "Speaker N" placeholder is not a
    // real named person, so it stays Unassigned (CLAUDE.md §15).
    const knownSpeakerNames = new Map<string, string>();
    for (const p of knownParticipants) {
      if (p.speakerLabel && p.name.trim()) knownSpeakerNames.set(p.speakerLabel, p.name.trim());
    }

    // A lookup from a lowercased known-participant name → their canonical name,
    // used ONLY to attribute an owner that the transcript itself mentions.
    const knownNames = new Map<string, string>();
    for (const p of knownParticipants) {
      if (p.name.trim()) knownNames.set(p.name.trim().toLowerCase(), p.name.trim());
    }

    const decisions: DecisionDTO[] = [];
    const actionItems: ActionItemDTO[] = [];
    const risks: string[] = [];
    const questions: string[] = [];
    const discussionPoints: string[] = [];

    let actionOrdinal = 0;

    for (const seg of segments) {
      const text = seg.text.trim();
      const marker = cueMarker(text);
      const body = stripMarker(text);
      // The speaker of the line, resolved to a scheduled participant name when the
      // label maps to one; used as the fallback "decidedBy" for decisions only.
      // A bare speaker-label placeholder does NOT count as a named person.
      const speakerName = knownSpeakerNames.get(seg.speakerLabel) ?? null;

      switch (marker) {
        case 'DECISION':
          decisions.push({
            id: `dec_${decisions.length + 1}`,
            description: body,
            // A decision is attributed to the speaker when they map to a known
            // participant; otherwise Unassigned. Never invented.
            decidedBy: speakerName ?? UNASSIGNED_OWNER,
            confidence: 0.9,
          });
          break;
        case 'ACTION': {
          actionOrdinal += 1;
          actionItems.push({
            id: `act_${actionOrdinal}`,
            ordinal: actionOrdinal,
            description: body,
            // Owner ONLY if the line explicitly names a known participant.
            owner: extractOwner(body, knownNames) ?? UNASSIGNED_OWNER,
            // Due date ONLY if the line explicitly contains one.
            dueDate: extractDueDate(body) ?? UNSPECIFIED_DUE_DATE,
            status: 'OPEN',
            priority: 'MEDIUM',
            confidence: 0.85,
          });
          break;
        }
        case 'RISK':
          risks.push(body);
          break;
        case 'QUESTION':
          questions.push(body);
          break;
        default:
          // Substantive statements become discussion points; short acks are skipped.
          if (body.length >= 40) discussionPoints.push(body);
          break;
      }
    }

    const summary: MeetingSummaryDTO = {
      overview: buildOverview(input.meetingTitle, participants, decisions, actionItems),
      discussionPoints,
      risks,
      questions,
      nextSteps: buildNextSteps(segments),
    };

    return { summary, decisions, actionItems, participants };
  }
}

/** Recognised transcript cue markers. Only these drive structured extraction. */
type CueMarker = 'DECISION' | 'ACTION' | 'RISK' | 'QUESTION' | null;

function cueMarker(text: string): CueMarker {
  const upper = text.toUpperCase();
  if (upper.startsWith('DECISION:')) return 'DECISION';
  if (upper.startsWith('ACTION:')) return 'ACTION';
  if (upper.startsWith('RISK:')) return 'RISK';
  if (upper.startsWith('QUESTION:')) return 'QUESTION';
  // A trailing question mark also marks a question even without the cue word.
  if (text.trim().endsWith('?')) return 'QUESTION';
  return null;
}

function stripMarker(text: string): string {
  return text.replace(/^\s*(DECISION|ACTION|RISK|QUESTION)\s*:\s*/i, '').trim();
}

/**
 * Extracts an owner ONLY when the action line explicitly names a known
 * participant. Recognises the "— <name> by <date>" convention used by the mock
 * transcript, but validates the name against the known roster. Returns null when
 * no known participant is named (caller substitutes the Unassigned sentinel).
 */
function extractOwner(body: string, knownNames: Map<string, string>): string | null {
  if (knownNames.size === 0) return null;
  const lower = body.toLowerCase();
  for (const [key, canonical] of knownNames) {
    // Word-boundary match so "Sam" doesn't match "sample".
    const re = new RegExp(`\\b${escapeRegExp(key)}\\b`);
    if (re.test(lower)) return canonical;
  }
  return null;
}

/** Extracts an ISO (yyyy-mm-dd) due date if the line contains one; else null. */
function extractDueDate(body: string): string | null {
  const iso = body.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return iso ? iso[1]! : null;
}

/**
 * Builds the participant list the analysis may reference: the known roster,
 * plus any transcript speaker label that actually appears and is not already
 * represented. No participant is invented from thin air.
 */
function resolveParticipants(input: AnalyzeInput): ParticipantDTO[] {
  const result: ParticipantDTO[] = input.knownParticipants.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    speakerLabel: p.speakerLabel,
  }));

  const claimedLabels = new Set(
    result.map((p) => p.speakerLabel).filter((l): l is string => Boolean(l)),
  );
  const seen = new Set<string>();
  for (const seg of input.segments) {
    const label = seg.speakerLabel.trim();
    if (!label || claimedLabels.has(label) || seen.has(label)) continue;
    seen.add(label);
    // An unmapped speaker is surfaced by their raw label only — never given a
    // fabricated name, email, or role.
    result.push({ id: `spk_${result.length + 1}`, name: label, email: null, role: null, speakerLabel: label });
  }
  return result;
}

function buildOverview(
  title: string,
  participants: ParticipantDTO[],
  decisions: DecisionDTO[],
  actionItems: ActionItemDTO[],
): string {
  const who =
    participants.length > 0
      ? `${participants.length} participant${participants.length === 1 ? '' : 's'}`
      : 'the attendees';
  return (
    `Summary of "${title}" with ${who}. ` +
    `The discussion produced ${decisions.length} decision${decisions.length === 1 ? '' : 's'} ` +
    `and ${actionItems.length} action item${actionItems.length === 1 ? '' : 's'}.`
  );
}

/** Derives next steps only from lines that explicitly describe a follow-up. */
function buildNextSteps(segments: TranscriptSegmentInput[]): string[] {
  const steps: string[] = [];
  for (const seg of segments) {
    const t = seg.text.trim();
    if (/\bnext step\b|\bfollow[- ]?up\b|\bsync (again|up)\b/i.test(t)) {
      steps.push(stripMarker(t));
    }
  }
  return steps;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
