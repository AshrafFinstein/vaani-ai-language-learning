import type {
  CalendarStatusDTO,
  CalendarSyncInput,
  CalendarSyncResultDTO,
  MeetingDetailDTO,
  MeetingDTO,
  MeetingPrivacySettings,
  MeetingSummaryListDTO,
  RecordingControlInput,
  RecordingSessionDTO,
  ScheduleMeetingInput,
  SchedulerTickResultDTO,
  StartRecordingInput,
  UpdatePrivacySettingsInput,
} from '@vaani/types';
import { api } from '@/lib/api';

export const meetingApi = {
  list: () => api.get<{ meetings: MeetingSummaryListDTO[] }>('/api/meetings'),
  schedule: (input: ScheduleMeetingInput) =>
    api.post<{ meeting: MeetingDTO }>('/api/meetings', input),
  detail: (id: string) => api.get<{ meeting: MeetingDetailDTO }>(`/api/meetings/${id}`),
  startRecording: (id: string, input: StartRecordingInput) =>
    api.post<{ recording: RecordingSessionDTO }>(`/api/meetings/${id}/recording/start`, input),
  controlRecording: (id: string, input: RecordingControlInput) =>
    api.post<{ recording: RecordingSessionDTO }>(`/api/meetings/${id}/recording/control`, input),
  getSettings: () => api.get<{ settings: MeetingPrivacySettings }>('/api/meetings/settings'),
  updateSettings: (input: UpdatePrivacySettingsInput) =>
    api.patch<{ settings: MeetingPrivacySettings }>('/api/meetings/settings', input),
  deleteRecording: (id: string) =>
    api.delete<{ deleted: boolean }>(`/api/meetings/${id}/recording`),
  deleteTranscript: (id: string) =>
    api.delete<{ deleted: boolean }>(`/api/meetings/${id}/transcript`),
  // ── Calendar sync (read-only) + scheduler tick ──────────────────────────────
  calendarStatus: () => api.get<{ status: CalendarStatusDTO }>('/api/meetings/calendar/status'),
  calendarSync: (input: CalendarSyncInput = {}) =>
    api.post<{ result: CalendarSyncResultDTO }>('/api/meetings/calendar/sync', input),
  schedulerTick: () =>
    api.post<{ result: SchedulerTickResultDTO }>('/api/meetings/scheduler/tick', {}),
};
