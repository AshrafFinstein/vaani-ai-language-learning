import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { MeetingDetailDTO } from '@vaani/types';
import { MeetingUpload } from '@/features/meeting/components/MeetingUpload';
import { renderWithProviders } from './test-utils';

const idle = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null };
vi.mock('@/features/meeting/useMeetings', () => ({
  useTranscribeAudio: () => idle,
  useIngestTranscript: () => idle,
}));

function meeting(overrides: Partial<MeetingDetailDTO> = {}): MeetingDetailDTO {
  return {
    id: 'm_1',
    title: 'Weekly sync',
    provider: 'TEAMS',
    scheduledStart: '2026-10-01T10:00:00.000Z',
    scheduledEnd: '2026-10-01T11:00:00.000Z',
    recordingEnabled: true,
    transcriptionEnabled: true,
    aiAnalysisEnabled: true,
    analysisStatus: 'PENDING',
    status: 'SCHEDULED',
    teamsMeetingId: null,
    joinUrl: null,
    externalCalendarId: null,
    notifiedAt: null,
    startedAt: null,
    endedAt: null,
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
    participants: [],
    recording: {
      id: 'r_1',
      meetingId: 'm_1',
      state: 'STOPPED',
      recordingConsent: true,
      startedAt: null,
      endedAt: null,
      durationSeconds: 0,
    },
    summary: null,
    decisions: [],
    actionItems: [],
    questions: [],
    transcriptSegments: [],
    ...overrides,
  };
}

describe('MeetingUpload', () => {
  it('renders both a recording and a transcript upload control', () => {
    renderWithProviders(<MeetingUpload meeting={meeting()} />);
    expect(screen.getByLabelText(/upload recording/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload transcript/i)).toBeInTheDocument();
  });

  it('shows a consent/transcription warning and disables uploads when transcription is off', () => {
    renderWithProviders(<MeetingUpload meeting={meeting({ transcriptionEnabled: false })} />);
    expect(screen.getByText(/transcription is disabled for this meeting/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload recording/i)).toBeDisabled();
    expect(screen.getByLabelText(/upload transcript/i)).toBeDisabled();
  });
});
