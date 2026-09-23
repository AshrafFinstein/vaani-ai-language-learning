import { Router } from 'express';
import {
  CalendarSyncInput,
  MeetingTranscribeAudioInput,
  RecordingControlInput,
  ScheduleMeetingInput,
  SchedulerTickInput,
  StartRecordingInput,
  UpdatePrivacySettingsInput,
} from '@vaani/types';
import { meetingController } from './meeting.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { speechLimiter } from '../../middleware/rate-limit.js';
import { asyncHandler } from '../../lib/async-handler.js';

export const meetingRouter = Router();

meetingRouter.use(requireAuth);

// Per-user privacy settings. Declared before /:id so "settings" isn't treated as an id.
meetingRouter.get('/settings', asyncHandler(meetingController.getPrivacySettings));
meetingRouter.patch(
  '/settings',
  validateBody(UpdatePrivacySettingsInput),
  asyncHandler(meetingController.updatePrivacySettings),
);

// Calendar sync (read-only) + scheduler tick + capture capability. Declared before
// /:id so these literal segments aren't treated as meeting ids.
meetingRouter.get('/calendar/status', asyncHandler(meetingController.calendarStatus));
meetingRouter.post(
  '/calendar/sync',
  validateBody(CalendarSyncInput),
  asyncHandler(meetingController.calendarSync),
);
meetingRouter.post(
  '/scheduler/tick',
  validateBody(SchedulerTickInput),
  asyncHandler(meetingController.schedulerTick),
);
meetingRouter.get('/capture/capability', asyncHandler(meetingController.captureCapability));

meetingRouter.get('/', asyncHandler(meetingController.list));
meetingRouter.post('/', validateBody(ScheduleMeetingInput), asyncHandler(meetingController.schedule));
meetingRouter.get('/:id', asyncHandler(meetingController.detail));

// Recording lifecycle (state transitions only — no real capture).
meetingRouter.post(
  '/:id/recording/start',
  validateBody(StartRecordingInput),
  asyncHandler(meetingController.startRecording),
);
meetingRouter.post(
  '/:id/recording/control',
  validateBody(RecordingControlInput),
  asyncHandler(meetingController.controlRecording),
);

// Real STT on PROVIDED meeting audio (consent-gated; NOT live capture). Billable →
// rate-limited like the speech endpoints.
meetingRouter.post(
  '/:id/transcribe',
  speechLimiter,
  validateBody(MeetingTranscribeAudioInput),
  asyncHandler(meetingController.transcribeAudio),
);

// Privacy controls: delete stored recording/transcript for a meeting.
meetingRouter.delete('/:id/recording', asyncHandler(meetingController.deleteRecording));
meetingRouter.delete('/:id/transcript', asyncHandler(meetingController.deleteTranscript));
