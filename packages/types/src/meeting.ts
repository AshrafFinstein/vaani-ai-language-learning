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

/**
 * The meeting lifecycle state machine (Meeting AI automation). Transitions are
 * validated server-side; illegal jumps are rejected. `CAPTURING` models capture
 * *state* only — real local/AVD capture stays deferred and is consent-gated.
 */
export const MeetingStatus = z.enum([
  'SCHEDULED',
  'NOTIFIED',
  'STARTED',
  'CAPTURING',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
]);
export type MeetingStatus = z.infer<typeof MeetingStatus>;

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
    /**
     * Optional Teams meeting invite link. When supplied, the API stores it on the
     * meeting and derives the `teamsMeetingId` from it (never inventing one). This is the
     * locked-down AVD path: the user has the link even without calendar/Graph access.
     * Trimmed; an empty string is treated as omitted (→ undefined).
     */
    joinUrl: z
      .string()
      .trim()
      .url('Enter a valid http(s) meeting link')
      .optional()
      .or(z.literal('').transform(() => undefined)),
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
  /** Important topics distilled from the transcript (never fabricated, CLAUDE.md §15). */
  importantTopics: z.array(z.string()).default([]),
});
export type MeetingSummaryDTO = z.infer<typeof MeetingSummaryDTO>;

/**
 * A distinct question raised during the meeting. `askedBy` is `Unassigned` when the
 * speaker maps to no known participant; `answered` reflects explicit evidence only.
 */
export const QuestionDTO = z.object({
  id: z.string(),
  ordinal: z.number().int(),
  text: z.string(),
  askedBy: z.string(),
  answered: z.boolean(),
});
export type QuestionDTO = z.infer<typeof QuestionDTO>;

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
  /** Distinct questions raised, extracted from the transcript (never invented). */
  questions: z.array(QuestionDTO).default([]),
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
  /** Lifecycle state (SCHEDULED…COMPLETED/CANCELLED). Drives the automation UI. */
  status: MeetingStatus,
  /** Calendar linkage (populated by calendar sync; null for manual meetings). */
  teamsMeetingId: z.string().nullable(),
  joinUrl: z.string().nullable(),
  externalCalendarId: z.string().nullable(),
  notifiedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
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
  questions: z.array(QuestionDTO),
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

/**
 * Per-user privacy + automation defaults for Meeting Intelligence. The capture and
 * `autoCapture` flags govern the (deferred, consent-gated) local capture path;
 * `askBeforeCapture` defaults true so capture is never covert (CLAUDE.md §13–14).
 */
export const MeetingPrivacySettings = z.object({
  recordingConsent: z.boolean().default(false),
  transcriptConsent: z.boolean().default(false),
  autoRecord: z.boolean().default(false),
  autoTranscribe: z.boolean().default(false),
  /** Days to retain recordings/transcripts before eligible for deletion. */
  retentionDays: z.number().int().min(1).max(3650).default(30),
  // ── Automation ────────────────────────────────────────────────────────────
  /** Master switch for calendar-driven automatic capture (consent-gated). */
  autoCapture: z.boolean().default(false),
  /** Minutes before start to notify (reminder window). */
  reminderMinutes: z.number().int().min(0).max(1440).default(10),
  captureAudio: z.boolean().default(false),
  captureTranscript: z.boolean().default(false),
  captureSpeaker: z.boolean().default(false),
  /** Ask before any local capture starts — default true (never covert). */
  askBeforeCapture: z.boolean().default(true),
  extractSummary: z.boolean().default(true),
  extractDecisions: z.boolean().default(true),
  extractActionItems: z.boolean().default(true),
  extractQuestions: z.boolean().default(true),
  extractTopics: z.boolean().default(true),
});
export type MeetingPrivacySettings = z.infer<typeof MeetingPrivacySettings>;

export const UpdatePrivacySettingsInput = MeetingPrivacySettings.partial();
export type UpdatePrivacySettingsInput = z.infer<typeof UpdatePrivacySettingsInput>;

// ── Notifications (in-app only; push/desktop deferred) ────────────────────────

export const NotificationType = z.enum([
  'MEETING_REMINDER',
  'MEETING_STARTED',
  'ANALYSIS_READY',
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const NotificationDTO = z.object({
  id: z.string(),
  type: NotificationType,
  title: z.string(),
  body: z.string(),
  meetingId: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationDTO = z.infer<typeof NotificationDTO>;

export const NotificationListDTO = z.object({
  notifications: z.array(NotificationDTO),
  unreadCount: z.number().int(),
});
export type NotificationListDTO = z.infer<typeof NotificationListDTO>;

// ── Calendar sync (real Outlook read-only when configured; Mock default) ──────

/** Which calendar backend is active — surfaced so the UI can show connection status. */
export const CalendarProviderKind = z.enum(['mock', 'outlook', 'ics']);
export type CalendarProviderKind = z.infer<typeof CalendarProviderKind>;

/** A normalized calendar event (provider-agnostic). Read-only — Vaani never writes back. */
export const CalendarEventDTO = z.object({
  /** External calendar (Graph) event id — the idempotency key for sync. */
  externalCalendarId: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  joinUrl: z.string().nullable(),
  teamsMeetingId: z.string().nullable(),
  organizer: z
    .object({ name: z.string(), email: z.string().nullable() })
    .nullable(),
  attendees: z.array(z.object({ name: z.string(), email: z.string().nullable() })).default([]),
});
export type CalendarEventDTO = z.infer<typeof CalendarEventDTO>;

/** Calendar connection status surfaced in Settings (read-only). */
export const CalendarStatusDTO = z.object({
  provider: CalendarProviderKind,
  /** True when the active provider is a real (Outlook) connection with a token. */
  connected: z.boolean(),
  readOnly: z.literal(true),
});
export type CalendarStatusDTO = z.infer<typeof CalendarStatusDTO>;

/** Body for a calendar sync request — an optional window (defaults applied server-side). */
export const CalendarSyncInput = z.object({
  sinceIso: z.string().optional(),
  untilIso: z.string().optional(),
});
export type CalendarSyncInput = z.infer<typeof CalendarSyncInput>;

export const CalendarSyncResultDTO = z.object({
  provider: CalendarProviderKind,
  created: z.number().int(),
  updated: z.number().int(),
  meetings: z.array(MeetingDTO),
});
export type CalendarSyncResultDTO = z.infer<typeof CalendarSyncResultDTO>;

// ── ICS calendar (admin-free AVD path: published feed URL + .ics file import) ──

/**
 * Sets the user's published Outlook/Teams ICS feed URL and triggers a sync. This is the
 * admin-free alternative to Microsoft Graph — no Azure app registration is required.
 * The URL must be http(s) (or webcal, normalized server-side); an empty string CLEARS it.
 */
export const SetIcsCalendarInput = z.object({
  url: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^(https?|webcal):\/\//i.test(v),
      'Enter an http(s) or webcal ICS feed URL, or leave blank to disconnect',
    ),
  /** Optional sync window (defaults applied server-side). */
  sinceIso: z.string().optional(),
  untilIso: z.string().optional(),
});
export type SetIcsCalendarInput = z.infer<typeof SetIcsCalendarInput>;

/**
 * Imports an uploaded `.ics` file: its raw text (optionally base64/data-URL wrapped) is
 * parsed and upserted into local Meetings via the existing sync idempotency (UID key).
 * No network — the content is supplied by the caller (drag-and-drop / file picker).
 */
export const ImportIcsFileInput = z.object({
  /** Raw ICS text, or a `data:text/calendar;base64,…` / bare base64 payload. */
  content: z.string().min(1, 'ICS file content is required').max(5_000_000, 'ICS file is too large'),
  sinceIso: z.string().optional(),
  untilIso: z.string().optional(),
});
export type ImportIcsFileInput = z.infer<typeof ImportIcsFileInput>;

// ── Provided transcript → analysis (AVD capture story: drop a .vtt/plain text) ─

/**
 * Feeds a PROVIDED transcript (Teams `.vtt` or plain text) straight into the analysis
 * pipeline — the AVD-friendly complement to the audio→Whisper route. Consent-gated: the
 * meeting must have transcription enabled AND transcript consent granted (CLAUDE.md §13).
 */
export const ProvidedTranscriptInput = z.object({
  /** Raw transcript text (a WebVTT document or plain text). */
  content: z.string().min(1, 'Transcript content is required').max(5_000_000, 'Transcript is too large'),
  /** How to interpret `content`. Defaults to auto-detect (`WEBVTT` header → vtt). */
  format: z.enum(['vtt', 'text', 'auto']).default('auto'),
  /** Optional BCP-47/ISO language hint, e.g. "en", "es". */
  languageCode: z.string().min(2).max(10).optional(),
});
export type ProvidedTranscriptInput = z.infer<typeof ProvidedTranscriptInput>;

// ── Scheduler tick (invoked via endpoint; injected `now` for determinism) ─────

/** Optional injected `now` (ISO). Server defaults to the real clock when omitted. */
export const SchedulerTickInput = z.object({
  nowIso: z.string().optional(),
});
export type SchedulerTickInput = z.infer<typeof SchedulerTickInput>;

export const SchedulerTickResultDTO = z.object({
  notified: z.array(z.string()),
  started: z.array(z.string()),
  processing: z.array(z.string()),
});
export type SchedulerTickResultDTO = z.infer<typeof SchedulerTickResultDTO>;

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
