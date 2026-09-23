import type { Prisma } from '@prisma/client';
import {
  UNASSIGNED_OWNER,
  UNSPECIFIED_DUE_DATE,
  type ActionItemDTO,
  type DecisionDTO,
  type MeetingDetailDTO,
  type MeetingDTO,
  type MeetingPrivacySettings,
  type MeetingSummaryDTO,
  type MeetingSummaryListDTO,
  type ParticipantDTO,
  type RecordingAction,
  type RecordingSessionDTO,
  type ScheduleMeetingInput,
  type StartRecordingInput,
  type TranscriptSegmentDTO,
  type UpdatePrivacySettingsInput,
} from '@vaani/types';
import {
  createMeetingAnalysisProvider,
  createMeetingTranscriptProvider,
  type KnownParticipant,
  type TranscriptSegmentInput,
} from '@vaani/meeting';
import type { MeetingDetailDTO as MeetingDetail } from '@vaani/types';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import { recordActivity } from '../../lib/activity.js';
import { getSttProvider } from '../../lib/ai.js';
import { decodeAudio } from '../speech/speech.service.js';

// ── Mappers ─────────────────────────────────────────────────────────────────

function toMeetingDTO(m: {
  id: string;
  title: string;
  provider: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  aiAnalysisEnabled: boolean;
  analysisStatus: string;
  createdAt: Date;
  updatedAt: Date;
}): MeetingDTO {
  return {
    id: m.id,
    title: m.title,
    provider: m.provider as MeetingDTO['provider'],
    scheduledStart: m.scheduledStart.toISOString(),
    scheduledEnd: m.scheduledEnd.toISOString(),
    recordingEnabled: m.recordingEnabled,
    transcriptionEnabled: m.transcriptionEnabled,
    aiAnalysisEnabled: m.aiAnalysisEnabled,
    analysisStatus: m.analysisStatus as MeetingDTO['analysisStatus'],
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

function toParticipantDTO(p: {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  speakerLabel: string | null;
}): ParticipantDTO {
  return { id: p.id, name: p.name, email: p.email, role: p.role, speakerLabel: p.speakerLabel };
}

function toRecordingDTO(r: {
  id: string;
  meetingId: string;
  state: string;
  recordingConsent: boolean;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number;
}): RecordingSessionDTO {
  return {
    id: r.id,
    meetingId: r.meetingId,
    state: r.state as RecordingSessionDTO['state'],
    recordingConsent: r.recordingConsent,
    startedAt: r.startedAt ? r.startedAt.toISOString() : null,
    endedAt: r.endedAt ? r.endedAt.toISOString() : null,
    durationSeconds: r.durationSeconds,
  };
}

type MeetingWithRelations = Prisma.MeetingGetPayload<{
  include: {
    participants: true;
    recording: true;
    summary: true;
    decisions: true;
    actionItems: true;
    transcript: { include: { segments: true } };
  };
}>;

function toDetailDTO(m: MeetingWithRelations): MeetingDetailDTO {
  const summary: MeetingSummaryDTO | null = m.summary
    ? {
        overview: m.summary.overview,
        discussionPoints: m.summary.discussionPoints,
        risks: m.summary.risks,
        questions: m.summary.questions,
        nextSteps: m.summary.nextSteps,
      }
    : null;

  const decisions: DecisionDTO[] = m.decisions.map((d) => ({
    id: d.id,
    description: d.description,
    decidedBy: d.decidedBy,
    confidence: d.confidence,
  }));

  const actionItems: ActionItemDTO[] = m.actionItems
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((a) => ({
      id: a.id,
      ordinal: a.ordinal,
      description: a.description,
      owner: a.owner,
      dueDate: a.dueDate,
      status: a.status as ActionItemDTO['status'],
      priority: a.priority as ActionItemDTO['priority'],
      confidence: a.confidence,
    }));

  const transcriptSegments: TranscriptSegmentDTO[] = (m.transcript?.segments ?? [])
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((s) => ({
      id: s.id,
      speakerLabel: s.speakerLabel,
      text: s.text,
      startMs: s.startMs,
      endMs: s.endMs,
    }));

  return {
    ...toMeetingDTO(m),
    participants: m.participants.map(toParticipantDTO),
    recording: m.recording ? toRecordingDTO(m.recording) : null,
    summary,
    decisions,
    actionItems,
    transcriptSegments,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MEETING_INCLUDE = {
  participants: true,
  recording: true,
  summary: true,
  decisions: true,
  actionItems: true,
  transcript: { include: { segments: true } },
} satisfies Prisma.MeetingInclude;

async function getOwnedMeeting(userId: string, id: string): Promise<MeetingWithRelations> {
  const meeting = await prisma.meeting.findFirst({
    where: { id, userId },
    include: MEETING_INCLUDE,
  });
  if (!meeting) throw ApiException.notFound('Meeting not found');
  return meeting;
}

/** Combines a yyyy-mm-dd date and HH:mm time into a Date. */
function combineDateTime(date: string, time: string): Date {
  const dt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dt.getTime())) throw ApiException.badRequest('Invalid date or time');
  return dt;
}

// ── Service ─────────────────────────────────────────────────────────────────

export const meetingService = {
  async schedule(userId: string, input: ScheduleMeetingInput): Promise<MeetingDTO> {
    const scheduledStart = combineDateTime(input.date, input.startTime);
    const scheduledEnd = combineDateTime(input.date, input.endTime);

    const meeting = await prisma.meeting.create({
      data: {
        userId,
        title: input.title,
        provider: input.provider,
        scheduledStart,
        scheduledEnd,
        recordingEnabled: input.recordingEnabled,
        transcriptionEnabled: input.transcriptionEnabled,
        aiAnalysisEnabled: input.aiAnalysisEnabled,
        participants: {
          create: input.participants.map((p, i) => ({
            name: p.name,
            email: p.email ? p.email : null,
            role: p.role ?? null,
            // Deterministic speaker label so the mock pipeline can attribute lines.
            speakerLabel: `Speaker ${i + 1}`,
          })),
        },
        // A recording session exists from schedule time in IDLE state, with no
        // consent yet — consent is captured only when recording actually starts.
        recording: { create: { state: 'IDLE', recordingConsent: false } },
      },
    });
    return toMeetingDTO(meeting);
  },

  async list(userId: string): Promise<MeetingSummaryListDTO[]> {
    const meetings = await prisma.meeting.findMany({
      where: { userId },
      orderBy: { scheduledStart: 'desc' },
      include: {
        recording: true,
        _count: { select: { participants: true, actionItems: true } },
      },
    });
    return meetings.map((m) => ({
      ...toMeetingDTO(m),
      participantCount: m._count.participants,
      actionItemCount: m._count.actionItems,
      recordingState: (m.recording?.state ?? 'IDLE') as MeetingSummaryListDTO['recordingState'],
    }));
  },

  async detail(userId: string, id: string): Promise<MeetingDetailDTO> {
    return toDetailDTO(await getOwnedMeeting(userId, id));
  },

  /**
   * Starts recording. Consent is enforced server-side: the request body must
   * carry `recordingConsent: true` (Zod `literal(true)`), and we additionally
   * reject any attempt to enter RECORDING without it (CLAUDE.md §13).
   */
  async startRecording(
    userId: string,
    meetingId: string,
    input: StartRecordingInput,
  ): Promise<RecordingSessionDTO> {
    const meeting = await getOwnedMeeting(userId, meetingId);
    if (!input.recordingConsent) {
      throw ApiException.forbidden('Recording consent is required to start recording');
    }

    const existing = meeting.recording;
    if (existing && (existing.state === 'RECORDING' || existing.state === 'PAUSED')) {
      throw ApiException.conflict('Recording is already in progress');
    }

    const recording = await prisma.recordingSession.upsert({
      where: { meetingId },
      create: {
        meetingId,
        state: 'RECORDING',
        recordingConsent: true,
        transcriptConsent: input.transcriptConsent,
        startedAt: new Date(),
      },
      update: {
        state: 'RECORDING',
        recordingConsent: true,
        transcriptConsent: input.transcriptConsent,
        startedAt: new Date(),
        endedAt: null,
      },
    });
    return toRecordingDTO(recording);
  },

  /** Applies a PAUSE/RESUME/STOP transition. STOP triggers mock analysis. */
  async controlRecording(
    userId: string,
    meetingId: string,
    action: RecordingAction,
  ): Promise<RecordingSessionDTO> {
    const meeting = await getOwnedMeeting(userId, meetingId);
    const recording = meeting.recording;
    if (!recording || recording.state === 'IDLE') {
      throw ApiException.badRequest('Recording has not started');
    }

    if (action === 'PAUSE') {
      if (recording.state !== 'RECORDING') {
        throw ApiException.badRequest('Only an active recording can be paused');
      }
      const updated = await prisma.recordingSession.update({
        where: { meetingId },
        data: { state: 'PAUSED' },
      });
      return toRecordingDTO(updated);
    }

    if (action === 'RESUME') {
      if (recording.state !== 'PAUSED') {
        throw ApiException.badRequest('Only a paused recording can be resumed');
      }
      const updated = await prisma.recordingSession.update({
        where: { meetingId },
        data: { state: 'RECORDING' },
      });
      return toRecordingDTO(updated);
    }

    // STOP — finalise the session, then run the mock analysis pipeline.
    if (recording.state === 'STOPPED') {
      throw ApiException.badRequest('Recording is already stopped');
    }
    const endedAt = new Date();
    const durationSeconds = recording.startedAt
      ? Math.max(0, Math.floor((endedAt.getTime() - recording.startedAt.getTime()) / 1000))
      : 0;
    const stopped = await prisma.recordingSession.update({
      where: { meetingId },
      data: { state: 'STOPPED', endedAt, durationSeconds },
    });

    if (meeting.aiAnalysisEnabled) {
      await runAnalysis(meeting);
    }

    return toRecordingDTO(stopped);
  },

  async getPrivacySettings(userId: string): Promise<MeetingPrivacySettings> {
    const s = await prisma.meetingSettings.findUnique({ where: { userId } });
    return {
      recordingConsent: s?.recordingConsent ?? false,
      transcriptConsent: s?.transcriptConsent ?? false,
      autoRecord: s?.autoRecord ?? false,
      autoTranscribe: s?.autoTranscribe ?? false,
      retentionDays: s?.retentionDays ?? 30,
    };
  },

  async updatePrivacySettings(
    userId: string,
    input: UpdatePrivacySettingsInput,
  ): Promise<MeetingPrivacySettings> {
    const s = await prisma.meetingSettings.upsert({
      where: { userId },
      create: { userId, ...input },
      update: { ...input },
    });
    return {
      recordingConsent: s.recordingConsent,
      transcriptConsent: s.transcriptConsent,
      autoRecord: s.autoRecord,
      autoTranscribe: s.autoTranscribe,
      retentionDays: s.retentionDays,
    };
  },

  /** Deletes the stored recording session metadata for a meeting (privacy control). */
  async deleteRecording(userId: string, meetingId: string): Promise<void> {
    await getOwnedMeeting(userId, meetingId);
    await prisma.recordingSession.deleteMany({ where: { meetingId } });
  },

  /** Deletes the stored transcript (and its segments) for a meeting (privacy control). */
  async deleteTranscript(userId: string, meetingId: string): Promise<void> {
    await getOwnedMeeting(userId, meetingId);
    await prisma.transcript.deleteMany({ where: { meetingId } });
  },

  /**
   * Runs REAL speech-to-text on PROVIDED meeting audio, then feeds the transcript into
   * the existing analysis pipeline. This is NOT live capture — the caller supplies an
   * already-recorded file. Consent is enforced: the meeting must have transcription
   * enabled AND a recording session that granted transcript consent (CLAUDE.md §13).
   * Live/covert capture remains deferred (CLAUDE.md §14).
   */
  async transcribeProvidedAudio(
    userId: string,
    meetingId: string,
    audio: string,
    languageCode?: string,
  ): Promise<MeetingDetail> {
    const meeting = await getOwnedMeeting(userId, meetingId);

    if (!meeting.transcriptionEnabled) {
      throw ApiException.forbidden('Transcription is not enabled for this meeting');
    }
    if (!meeting.recording?.transcriptConsent) {
      throw ApiException.forbidden('Transcript consent is required to transcribe meeting audio');
    }

    const stt = getSttProvider();
    const { text } = await stt.transcribe(decodeAudio(audio), languageCode);
    if (!text.trim()) {
      throw ApiException.badRequest('No speech could be transcribed from the provided audio');
    }

    // A single-speaker segment: the STT provider returns plain text, so we cannot
    // fabricate diarization/speaker attribution — the analyzer sees the text as-is.
    const segments: TranscriptSegmentInput[] = [
      {
        speakerLabel: meeting.participants[0]?.speakerLabel ?? 'Speaker 1',
        text: text.trim(),
        startMs: 0,
        endMs: 0,
      },
    ];

    if (meeting.aiAnalysisEnabled) {
      await runAnalysis(meeting, { segments, language: languageCode ?? 'en' });
    } else {
      // Persist just the transcript when analysis is disabled, replacing any prior run.
      await prisma.$transaction(async (tx) => {
        await tx.transcript.deleteMany({ where: { meetingId } });
        await tx.transcript.create({
          data: {
            meetingId,
            language: languageCode ?? 'en',
            segments: {
              create: segments.map((s, i) => ({
                speakerLabel: s.speakerLabel,
                text: s.text,
                startMs: s.startMs,
                endMs: s.endMs,
                ordinal: i,
              })),
            },
          },
        });
      });
    }

    return toDetailDTO(await getOwnedMeeting(userId, meetingId));
  },
};

/**
 * Runs the analysis pipeline for a meeting: obtain a transcript, analyze it, and
 * persist the transcript + summary + decisions + action items. Existing analysis for
 * the meeting is replaced so re-running is idempotent.
 *
 * When `providedSegments` is passed (real STT on PROVIDED audio), those segments are
 * used verbatim; otherwise the deterministic MOCK transcript generator supplies them.
 * Either way the analyzer only ever sees transcript evidence — it never invents
 * participants/owners/decisions (CLAUDE.md §15).
 */
async function runAnalysis(
  meeting: MeetingWithRelations,
  provided?: { segments: TranscriptSegmentInput[]; language: string },
): Promise<void> {
  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { analysisStatus: 'PROCESSING' },
  });

  try {
    const knownParticipants: KnownParticipant[] = meeting.participants.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      speakerLabel: p.speakerLabel,
    }));

    let segments: TranscriptSegmentInput[];
    let language: string;
    if (provided) {
      ({ segments, language } = provided);
    } else {
      const transcriptProvider = createMeetingTranscriptProvider();
      ({ segments, language } = await transcriptProvider.generate({
        meetingTitle: meeting.title,
        knownParticipants,
      }));
    }

    const analyzer = createMeetingAnalysisProvider();
    const analysis = await analyzer.analyze({
      meetingTitle: meeting.title,
      segments,
      knownParticipants,
    });

    // Persist the transcript + analysis atomically, replacing any prior run.
    await prisma.$transaction(async (tx) => {
      await tx.transcript.deleteMany({ where: { meetingId: meeting.id } });
      await tx.meetingSummary.deleteMany({ where: { meetingId: meeting.id } });
      await tx.meetingDecision.deleteMany({ where: { meetingId: meeting.id } });
      await tx.actionItem.deleteMany({ where: { meetingId: meeting.id } });

      await tx.transcript.create({
        data: {
          meetingId: meeting.id,
          language,
          segments: {
            create: segments.map((s, i) => ({
              speakerLabel: s.speakerLabel,
              text: s.text,
              startMs: s.startMs,
              endMs: s.endMs,
              ordinal: i,
            })),
          },
        },
      });

      await tx.meetingSummary.create({
        data: {
          meetingId: meeting.id,
          overview: analysis.summary.overview,
          discussionPoints: analysis.summary.discussionPoints,
          risks: analysis.summary.risks,
          questions: analysis.summary.questions,
          nextSteps: analysis.summary.nextSteps,
        },
      });

      if (analysis.decisions.length > 0) {
        await tx.meetingDecision.createMany({
          data: analysis.decisions.map((d) => ({
            meetingId: meeting.id,
            description: d.description,
            // Sentinel-preserving: never write a fabricated owner.
            decidedBy: d.decidedBy || UNASSIGNED_OWNER,
            confidence: d.confidence,
          })),
        });
      }

      if (analysis.actionItems.length > 0) {
        await tx.actionItem.createMany({
          data: analysis.actionItems.map((a) => ({
            meetingId: meeting.id,
            ordinal: a.ordinal,
            description: a.description,
            owner: a.owner || UNASSIGNED_OWNER,
            dueDate: a.dueDate || UNSPECIFIED_DUE_DATE,
            status: a.status,
            priority: a.priority,
            confidence: a.confidence,
          })),
        });
      }

      await tx.meeting.update({
        where: { id: meeting.id },
        data: { analysisStatus: 'COMPLETED' },
      });
    });
    // Record the meeting activity for progress analytics (best-effort, post-commit).
    await recordActivity(meeting.userId, 'MEETING');
  } catch (err) {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { analysisStatus: 'FAILED' },
    });
    throw err;
  }
}
