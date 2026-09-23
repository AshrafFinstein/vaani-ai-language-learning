import type { Request, Response } from 'express';
import type {
  CalendarSyncInput,
  MeetingTranscribeAudioInput,
  RecordingControlInput,
  ScheduleMeetingInput,
  SchedulerTickInput,
  StartRecordingInput,
  UpdatePrivacySettingsInput,
} from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { meetingService } from './meeting.service.js';
import { calendarService } from './calendar.service.js';
import { schedulerService } from './scheduler.service.js';
import { getCaptureProvider } from '../../lib/calendar.js';

function userId(req: Request): string {
  if (!req.auth) throw ApiException.unauthorized();
  return req.auth.userId;
}

export const meetingController = {
  async schedule(req: Request, res: Response): Promise<void> {
    const meeting = await meetingService.schedule(userId(req), req.body as ScheduleMeetingInput);
    res.status(201).json({ data: { meeting } });
  },

  async list(req: Request, res: Response): Promise<void> {
    const meetings = await meetingService.list(userId(req));
    res.status(200).json({ data: { meetings } });
  },

  async detail(req: Request, res: Response): Promise<void> {
    const meeting = await meetingService.detail(userId(req), req.params.id!);
    res.status(200).json({ data: { meeting } });
  },

  async startRecording(req: Request, res: Response): Promise<void> {
    const recording = await meetingService.startRecording(
      userId(req),
      req.params.id!,
      req.body as StartRecordingInput,
    );
    res.status(200).json({ data: { recording } });
  },

  async controlRecording(req: Request, res: Response): Promise<void> {
    const { action } = req.body as RecordingControlInput;
    const recording = await meetingService.controlRecording(userId(req), req.params.id!, action);
    res.status(200).json({ data: { recording } });
  },

  async getPrivacySettings(req: Request, res: Response): Promise<void> {
    const settings = await meetingService.getPrivacySettings(userId(req));
    res.status(200).json({ data: { settings } });
  },

  async updatePrivacySettings(req: Request, res: Response): Promise<void> {
    const settings = await meetingService.updatePrivacySettings(
      userId(req),
      req.body as UpdatePrivacySettingsInput,
    );
    res.status(200).json({ data: { settings } });
  },

  async deleteRecording(req: Request, res: Response): Promise<void> {
    await meetingService.deleteRecording(userId(req), req.params.id!);
    res.status(200).json({ data: { deleted: true } });
  },

  async deleteTranscript(req: Request, res: Response): Promise<void> {
    await meetingService.deleteTranscript(userId(req), req.params.id!);
    res.status(200).json({ data: { deleted: true } });
  },

  /** Runs real STT on PROVIDED meeting audio and feeds the analysis pipeline. */
  async transcribeAudio(req: Request, res: Response): Promise<void> {
    const { audio, languageCode } = req.body as MeetingTranscribeAudioInput;
    const meeting = await meetingService.transcribeProvidedAudio(
      userId(req),
      req.params.id!,
      audio,
      languageCode,
    );
    res.status(200).json({ data: { meeting } });
  },

  // ── Calendar sync (read-only) ───────────────────────────────────────────────

  /** Reports the active calendar backend + connection status (Mock vs Outlook). */
  async calendarStatus(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ data: { status: calendarService.status() } });
  },

  /** Syncs upcoming calendar events into local Meeting rows (idempotent). */
  async calendarSync(req: Request, res: Response): Promise<void> {
    const { sinceIso, untilIso } = req.body as CalendarSyncInput;
    const result = await calendarService.sync(userId(req), sinceIso, untilIso);
    res.status(200).json({ data: { result } });
  },

  // ── Scheduler tick (invoked; no always-on timer) ────────────────────────────

  async schedulerTick(req: Request, res: Response): Promise<void> {
    const { nowIso } = req.body as SchedulerTickInput;
    const now = nowIso ? new Date(nowIso) : new Date();
    if (Number.isNaN(now.getTime())) throw ApiException.badRequest('Invalid nowIso');
    const result = await schedulerService.tick(userId(req), now);
    res.status(200).json({ data: { result } });
  },

  // ── Capture (Local/AVD; state-only, real capture deferred) ──────────────────

  /** Reports whether real local capture is available in this environment. */
  async captureCapability(_req: Request, res: Response): Promise<void> {
    const provider = getCaptureProvider();
    const audioSupported = provider.isSupported();
    res.status(200).json({
      data: {
        capability: {
          audioSupported,
          state: provider.getState(),
          reason: audioSupported
            ? undefined
            : 'Live local/AVD audio capture is deferred in this environment. Provide already-recorded audio to the transcribe endpoint for real STT.',
        },
      },
    });
  },
};
