import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  RecordingControlInput,
  ScheduleMeetingInput,
  StartRecordingInput,
  UpdatePrivacySettingsInput,
} from '@vaani/types';
import { meetingApi } from './meeting.api';

const KEYS = {
  list: ['meetings'] as const,
  detail: (id: string) => ['meeting', id] as const,
  settings: ['meeting-settings'] as const,
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
