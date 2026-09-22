import type { Request, Response } from 'express';
import type {
  RecordingControlInput,
  ScheduleMeetingInput,
  StartRecordingInput,
  UpdatePrivacySettingsInput,
} from '@vaani/types';
import { ApiException } from '../../lib/errors.js';
import { meetingService } from './meeting.service.js';

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
};
