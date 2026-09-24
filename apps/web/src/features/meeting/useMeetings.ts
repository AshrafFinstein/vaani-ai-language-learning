import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ImportIcsFileInput,
  ProvidedTranscriptInput,
  RecordingControlInput,
  ScheduleMeetingInput,
  SetIcsCalendarInput,
  StartRecordingInput,
  UpdatePrivacySettingsInput,
} from '@vaani/types';
import { meetingApi } from './meeting.api';

const KEYS = {
  list: ['meetings'] as const,
  detail: (id: string) => ['meeting', id] as const,
  settings: ['meeting-settings'] as const,
  calendarStatus: ['meeting-calendar-status'] as const,
};

export function useMeetings() {
  return useQuery({
    queryKey: KEYS.list,
    queryFn: () => meetingApi.list().then((r) => r.meetings),
  });
}

export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: () => meetingApi.detail(id!).then((r) => r.meeting),
    enabled: Boolean(id),
  });
}

export function useScheduleMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleMeetingInput) => meetingApi.schedule(input).then((r) => r.meeting),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

export function useStartRecording(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StartRecordingInput) =>
      meetingApi.startRecording(id, input).then((r) => r.recording),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  });
}

export function useControlRecording(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordingControlInput) =>
      meetingApi.controlRecording(id, input).then((r) => r.recording),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  });
}

export function useMeetingSettings() {
  return useQuery({
    queryKey: KEYS.settings,
    queryFn: () => meetingApi.getSettings().then((r) => r.settings),
  });
}

export function useUpdateMeetingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePrivacySettingsInput) =>
      meetingApi.updateSettings(input).then((r) => r.settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.settings }),
  });
}

export function useDeleteRecording(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingApi.deleteRecording(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  });
}

export function useDeleteTranscript(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingApi.deleteTranscript(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  });
}

export function useCalendarStatus() {
  return useQuery({
    queryKey: KEYS.calendarStatus,
    queryFn: () => meetingApi.calendarStatus().then((r) => r.status),
  });
}

/** Syncs upcoming calendar meetings into local rows, then refreshes the list. */
export function useCalendarSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingApi.calendarSync().then((r) => r.result),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

/** Sets the user's published ICS feed URL (admin-free path) and refreshes status + list. */
export function useSetIcsCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetIcsCalendarInput) =>
      meetingApi.setIcsCalendar(input).then((r) => r.result),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.calendarStatus });
      qc.invalidateQueries({ queryKey: KEYS.list });
    },
  });
}

/** Imports an uploaded `.ics` file into local meetings, then refreshes the list. */
export function useImportIcs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportIcsFileInput) => meetingApi.importIcs(input).then((r) => r.result),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list }),
  });
}

/** Ingests a PROVIDED transcript (.vtt / plain text) → analysis, then refreshes detail. */
export function useIngestTranscript(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProvidedTranscriptInput) =>
      meetingApi.ingestTranscript(id, input).then((r) => r.meeting),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  });
}

/** Uploads a PROVIDED recording (base64 audio) → real STT → analysis, refreshes detail. */
export function useTranscribeAudio(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { audio: string; languageCode?: string }) =>
      meetingApi.transcribeAudio(id, vars.audio, vars.languageCode).then((r) => r.meeting),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  });
}

/** Runs the scheduler tick (notify/start/process), then refreshes list + notifications. */
export function useSchedulerTick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingApi.schedulerTick().then((r) => r.result),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
