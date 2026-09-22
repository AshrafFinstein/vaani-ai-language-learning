import { z } from 'zod';

/**
 * Meeting Intelligence contracts (Phase 7B). Single source of truth for the meeting
 * DTOs shared by the web and api workspaces. This phase is a MOCK/prototype: it models
 * scheduling, consent-aware recording *state*, and analysis produced by a mock provider.
 * No real Teams/AVD/desktop/audio capture happens here (deferred pending environment
 * validation — see docs/MEETING_ARCHITECTURE.md).
 *
 * Privacy rule (CLAUDE.md §13–15): recording is user-visible + consent-gated, and the
 * analyzer must NEVER invent participants, owners, deadlines, decisions, or action items.
 * When a field is unsupported by the transcript, use the sentinels below.
 */
export const UNASSIGNED_OWNER = 'Unassigned';
export const UNSPECIFIED_DUE_DATE = 'Not specified';

/** Where the meeting is hosted. Real capture for these sources is a future phase. */
export const MeetingProvider = z.enum(['TEAMS', 'AVD', 'OTHER']);
export type MeetingProvider = z.infer<typeof MeetingProvider>;

/** Recording lifecycle — modelled as state transitions only (no real capture). */
export const RecordingState = z.enum(['IDLE', 'RECORDING', 'PAUSED', 'STOPPED']);
export type RecordingState = z.infer<typeof RecordingState>;

/** Whether the (mock) analysis pipeline has run for a meeting. */
export const AnalysisStatus = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);
export type AnalysisStatus = z.infer<typeof AnalysisStatus>;

export const ActionItemStatus = z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'BLOCKED']);
export type ActionItemStatus = z.infer<typeof ActionItemStatus>;

export const ActionItemPriority = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type ActionItemPriority = z.infer<typeof ActionItemPriority>;

/** A meeting participant. `speakerLabel` ties them to transcript segments (mock). */
export const ParticipantDTO = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  role: z.string().nullable(),
  speakerLabel: z.string().nullable(),
});
export type ParticipantDTO = z.infer<typeof ParticipantDTO>;

/** Input participant when scheduling — name is required, the rest optional. */
export const ScheduleParticipantInput = z.object({
  name: z.string().min(1, 'Participant name is required').max(120),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  role: z.string().max(80).optional(),
});
export type ScheduleParticipantInput = z.infer<typeof ScheduleParticipantInput>;

/** Create-a-meeting request. Consent is captured at recording start, not here. */
export const ScheduleMeetingInput = z
  .object({
    title: z.string().min(1, 'Give the meeting a title').max(200),
    /** ISO date (yyyy-mm-dd). */
    date: z.string().min(1, 'Choose a date'),
    /** 24h clock, HH:mm. */
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
    provider: MeetingProvider.default('TEAMS'),
    participants: z.array(ScheduleParticipantInput).default([]),
    recordingEnabled: z.boolean().default(false),
    transcriptionEnabled: z.boolean().default(false),
    aiAnalysisEnabled: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.endTime <= val.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must be after the start time',
      });
    }
  });
export type ScheduleMeetingInput = z.infer<typeof ScheduleMeetingInput>;

/** A confirmed action item. Confidence reflects the mock analyzer's certainty. */
export const ActionItemDTO = z.object({
  id: z.string(),
  /** 1-based ordinal for the "# / item / owner / status" table. */
  ordinal: z.number().int(),
  description: z.string(),
  /** `Unassigned` when the transcript does not name an owner. */
  owner: z.string(),
  /** `Not specified` when the transcript gives no deadline. */
  dueDate: z.string(),
  status: ActionItemStatus,
  priority: ActionItemPriority,
  /** 0–1; how confident the (mock) analyzer is this item is real. */
  confidence: z.number().min(0).max(1),
});
export type ActionItemDTO = z.infer<typeof ActionItemDTO>;

export const DecisionDTO = z.object({
  id: z.string(),
  description: z.string(),
  /** Who made/owns the decision; `Unassigned` when unsupported. */
  decidedBy: z.string(),
  confidence: z.number().min(0).max(1),
});
export type DecisionDTO = z.infer<typeof DecisionDTO>;

/** The narrative analysis surfaced on the meeting detail page. */
export const MeetingSummaryDTO = z.object({
  overview: z.string(),
  discussionPoints: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
});
export type MeetingSummaryDTO = z.infer<typeof MeetingSummaryDTO>;

export const TranscriptSegmentDTO = z.object({
  id: z.string(),
  speakerLabel: z.string(),
  text: z.string(),
  startMs: z.number().int(),
  endMs: z.number().int(),
});
export type TranscriptSegmentDTO = z.infer<typeof TranscriptSegmentDTO>;

/** The full analysis bundle produced by a MeetingAnalysisProvider from a transcript. */
export const MeetingAnalysisDTO = z.object({
  summary: MeetingSummaryDTO,
  decisions: z.array(DecisionDTO).default([]),
  actionItems: z.array(ActionItemDTO).default([]),
  /** Participants the analyzer could *derive from the transcript* (never invented). */
  participants: z.array(ParticipantDTO).default([]),
});
export type MeetingAnalysisDTO = z.infer<typeof MeetingAnalysisDTO>;

/** Recording session state (consent-gated). Surfaced to drive the UI indicator. */
export const RecordingSessionDTO = z.object({
  id: z.string(),
  meetingId: z.string(),
  state: RecordingState,
  /** Explicit user consent — a session cannot enter RECORDING without this true. */
  recordingConsent: z.boolean(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  durationSeconds: z.number().int(),
});
export type RecordingSessionDTO = z.infer<typeof RecordingSessionDTO>;

export const MeetingDTO = z.object({
  id: z.string(),
  title: z.string(),
  provider: MeetingProvider,
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  recordingEnabled: z.boolean(),
  transcriptionEnabled: z.boolean(),
  aiAnalysisEnabled: z.boolean(),
  analysisStatus: AnalysisStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MeetingDTO = z.infer<typeof MeetingDTO>;

/** Compact shape for the meeting list. */
export const MeetingSummaryListDTO = MeetingDTO.extend({
  participantCount: z.number().int(),
  actionItemCount: z.number().int(),
  recordingState: RecordingState,
});
export type MeetingSummaryListDTO = z.infer<typeof MeetingSummaryListDTO>;

/** Full meeting detail: metadata + participants + recording + analysis (when present). */
export const MeetingDetailDTO = MeetingDTO.extend({
  participants: z.array(ParticipantDTO),
  recording: RecordingSessionDTO.nullable(),
  summary: MeetingSummaryDTO.nullable(),
  decisions: z.array(DecisionDTO),
  actionItems: z.array(ActionItemDTO),
  transcriptSegments: z.array(TranscriptSegmentDTO),
});
export type MeetingDetailDTO = z.infer<typeof MeetingDetailDTO>;

/** Body for starting a recording — consent MUST be explicitly granted. */
export const StartRecordingInput = z.object({
  recordingConsent: z.literal(true, {
    errorMap: () => ({ message: 'Recording consent is required to start recording' }),
  }),
  transcriptConsent: z.boolean().default(false),
});
export type StartRecordingInput = z.infer<typeof StartRecordingInput>;

/** Recording control verbs available on an existing session. */
export const RecordingAction = z.enum(['PAUSE', 'RESUME', 'STOP']);
export type RecordingAction = z.infer<typeof RecordingAction>;

export const RecordingControlInput = z.object({
  action: RecordingAction,
});
export type RecordingControlInput = z.infer<typeof RecordingControlInput>;

/** Per-user privacy defaults for meeting recording/transcription. */
export const MeetingPrivacySettings = z.object({
  recordingConsent: z.boolean().default(false),
  transcriptConsent: z.boolean().default(false),
  autoRecord: z.boolean().default(false),
  autoTranscribe: z.boolean().default(false),
  /** Days to retain recordings/transcripts before eligible for deletion. */
  retentionDays: z.number().int().min(1).max(3650).default(30),
});
export type MeetingPrivacySettings = z.infer<typeof MeetingPrivacySettings>;

export const UpdatePrivacySettingsInput = MeetingPrivacySettings.partial();
export type UpdatePrivacySettingsInput = z.infer<typeof UpdatePrivacySettingsInput>;

export interface MeetingProviderMeta {
  value: MeetingProvider;
  label: string;
  description: string;
}

/** Presentation metadata for providers (labels live here so client & server agree). */
export const MEETING_PROVIDERS: MeetingProviderMeta[] = [
  { value: 'TEAMS', label: 'Microsoft Teams', description: 'Teams meeting (capture deferred)' },
  { value: 'AVD', label: 'Azure Virtual Desktop', description: 'AVD session (capture deferred)' },
  { value: 'OTHER', label: 'Other', description: 'Any other meeting source' },
];
