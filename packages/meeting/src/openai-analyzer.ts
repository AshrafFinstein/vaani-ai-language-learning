import { fetchWithRetry, type HttpHardeningOptions } from '@vaani/ai';
import {
  UNASSIGNED_OWNER,
  UNSPECIFIED_DUE_DATE,
  type ActionItemDTO,
  type DecisionDTO,
  type MeetingAnalysisDTO,
  type ParticipantDTO,
  type QuestionDTO,
} from '@vaani/types';
import type { AnalyzeInput, MeetingAnalysisProvider, KnownParticipant } from './types.js';
import { MockMeetingAnalysisProvider } from './mock-analyzer.js';

export interface OpenAIMeetingAnalyzerConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Degrade to the deterministic Mock analyzer on transient failure (opt-in). */
  fallbackToMock?: boolean;
  hardening?: HttpHardeningOptions;
}

interface OpenAIChoiceMessage {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * REAL OpenAI-backed meeting analyzer. Opt-in via env (Mock is the default). It sends
 * the transcript to an OpenAI-compatible `/chat/completions` endpoint asking for a
 * strict JSON analysis, then re-validates the result and RE-APPLIES the no-fabrication
 * guarantees (CLAUDE.md §15): owners/decidedBy/askedBy are accepted ONLY when they name
 * a scheduled participant, else the Unassigned sentinel; participants are never added
 * beyond the roster + speakers that actually appear; due dates must be explicit ISO.
 */
export class OpenAIMeetingAnalysisProvider implements MeetingAnalysisProvider {
  readonly name = 'openai';
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly mock?: MockMeetingAnalysisProvider;

  constructor(private readonly config: OpenAIMeetingAnalyzerConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAIMeetingAnalysisProvider requires an API key (set OPENAI_API_KEY).');
    }
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = config.model ?? 'gpt-4o-mini';
    this.mock = config.fallbackToMock ? new MockMeetingAnalysisProvider() : undefined;
  }

  async analyze(input: AnalyzeInput): Promise<MeetingAnalysisDTO> {
    try {
      const res = await fetchWithRetry(
        'OpenAIMeeting',
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: buildSystemPrompt() },
              { role: 'user', content: buildUserPrompt(input) },
            ],
          }),
        },
        this.config.hardening,
      );
      const data = (await res.json()) as OpenAIChoiceMessage;
      const raw = data.choices?.[0]?.message?.content ?? '{}';
      return sanitize(parseLoose(raw), input);
    } catch (err) {
      // Transient failure → deterministic Mock (opt-in), so an outage never 500s.
      if (this.mock) return this.mock.analyze(input);
      throw err;
    }
  }
}

function buildSystemPrompt(): string {
  return [
    'You are a meeting-analysis assistant. Analyze ONLY the transcript provided.',
    'NEVER invent participants, owners, deadlines, decisions, action items, questions, or topics.',
    'If a fact is not present in the transcript, omit it or use the provided sentinel.',
    'Return STRICT JSON with this shape:',
    '{"overview": string, "discussionPoints": string[], "risks": string[], "questions":',
    '[{"text": string, "askedBy": string, "answered": boolean}], "importantTopics": string[],',
    '"nextSteps": string[], "decisions": [{"description": string, "decidedBy": string}],',
    '"actionItems": [{"description": string, "owner": string, "dueDate": string}]}.',
    `Use "${UNASSIGNED_OWNER}" for any unknown owner/decidedBy/askedBy and`,
    `"${UNSPECIFIED_DUE_DATE}" for any unknown due date. dueDate must be yyyy-mm-dd if present.`,
  ].join(' ');
}

function buildUserPrompt(input: AnalyzeInput): string {
  const roster = input.knownParticipants
    .map((p) => `- ${p.name}${p.speakerLabel ? ` (${p.speakerLabel})` : ''}`)
    .join('\n');
  const transcript = input.segments.map((s) => `${s.speakerLabel}: ${s.text}`).join('\n');
  return [
    `Meeting: ${input.meetingTitle}`,
    `Known participants (the ONLY people you may name):\n${roster || '(none)'}`,
    `Transcript:\n${transcript || '(empty)'}`,
    'Produce the JSON analysis now.',
  ].join('\n\n');
}

/** Parses model JSON defensively (strips code fences / stray prose). */
function parseLoose(raw: string): Record<string, unknown> {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  }
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
}

/**
 * Re-applies the no-fabrication guarantees to whatever the model returned. This is the
 * safety net that makes the real path trustworthy: any owner/decidedBy/askedBy not in
 * the roster becomes the Unassigned sentinel; participants never exceed roster + speakers
 * that actually appear; due dates must be explicit ISO.
 */
function sanitize(obj: Record<string, unknown>, input: AnalyzeInput): MeetingAnalysisDTO {
  const knownNames = new Map<string, string>();
  for (const p of input.knownParticipants) {
    if (p.name.trim()) knownNames.set(p.name.trim().toLowerCase(), p.name.trim());
  }
  const nameOrUnassigned = (v: unknown): string => {
    if (typeof v !== 'string') return UNASSIGNED_OWNER;
    return knownNames.get(v.trim().toLowerCase()) ?? UNASSIGNED_OWNER;
  };
  const isoOrUnspecified = (v: unknown): string => {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
    return UNSPECIFIED_DUE_DATE;
  };

  const decisions: DecisionDTO[] = Array.isArray(obj.decisions)
    ? obj.decisions
        .filter((d): d is Record<string, unknown> => Boolean(d) && typeof d === 'object')
        .filter((d) => typeof d.description === 'string' && d.description.trim())
        .map((d, i) => ({
          id: `dec_${i + 1}`,
          description: String(d.description),
          decidedBy: nameOrUnassigned(d.decidedBy),
          confidence: 0.8,
        }))
    : [];

  const actionItems: ActionItemDTO[] = Array.isArray(obj.actionItems)
    ? obj.actionItems
        .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === 'object')
        .filter((a) => typeof a.description === 'string' && a.description.trim())
        .map((a, i) => ({
          id: `act_${i + 1}`,
          ordinal: i + 1,
          description: String(a.description),
          owner: nameOrUnassigned(a.owner),
          dueDate: isoOrUnspecified(a.dueDate),
          status: 'OPEN' as const,
          priority: 'MEDIUM' as const,
          confidence: 0.8,
        }))
    : [];

  const questions: QuestionDTO[] = Array.isArray(obj.questions)
    ? obj.questions
        .map((q, i): QuestionDTO | null => {
          if (typeof q === 'string') {
            return { id: `q_${i + 1}`, ordinal: i + 1, text: q, askedBy: UNASSIGNED_OWNER, answered: false };
          }
          if (q && typeof q === 'object' && typeof (q as Record<string, unknown>).text === 'string') {
            const o = q as Record<string, unknown>;
            return {
              id: `q_${i + 1}`,
              ordinal: i + 1,
              text: String(o.text),
              askedBy: nameOrUnassigned(o.askedBy),
              answered: o.answered === true,
            };
          }
          return null;
        })
        .filter((q): q is QuestionDTO => q !== null)
    : [];

  const participants = resolveParticipants(input);

  return {
    summary: {
      overview: typeof obj.overview === 'string' ? obj.overview : `Summary of "${input.meetingTitle}".`,
      discussionPoints: asStringArray(obj.discussionPoints),
      risks: asStringArray(obj.risks),
      questions: questions.map((q) => q.text),
      nextSteps: asStringArray(obj.nextSteps),
      importantTopics: asStringArray(obj.importantTopics),
    },
    decisions,
    actionItems,
    questions,
    participants,
  };
}

/** Roster + any speaker label that actually appears — never an invented person. */
function resolveParticipants(input: AnalyzeInput): ParticipantDTO[] {
  const result: ParticipantDTO[] = input.knownParticipants.map((p: KnownParticipant) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    speakerLabel: p.speakerLabel,
  }));
  const claimed = new Set(result.map((p) => p.speakerLabel).filter((l): l is string => Boolean(l)));
  const seen = new Set<string>();
  for (const seg of input.segments) {
    const label = seg.speakerLabel.trim();
    if (!label || claimed.has(label) || seen.has(label)) continue;
    seen.add(label);
    result.push({ id: `spk_${result.length + 1}`, name: label, email: null, role: null, speakerLabel: label });
  }
  return result;
}
