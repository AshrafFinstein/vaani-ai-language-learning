import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { CalendarStatusDTO, MeetingPrivacySettings } from '@vaani/types';
import { MeetingSettingsPanel } from '@/features/meeting/components/MeetingSettingsPanel';
import { renderWithProviders } from './test-utils';

const useMeetingSettingsMock = vi.fn();
const useCalendarStatusMock = vi.fn();
vi.mock('@/features/meeting/useMeetings', () => ({
  useMeetingSettings: () => useMeetingSettingsMock(),
  useCalendarStatus: () => useCalendarStatusMock(),
  useUpdateMeetingSettings: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false }),
}));

const SETTINGS: MeetingPrivacySettings = {
  recordingConsent: false,
  transcriptConsent: false,
  autoRecord: false,
  autoTranscribe: false,
  retentionDays: 30,
  autoCapture: true,
  reminderMinutes: 10,
  captureAudio: false,
  captureTranscript: false,
  captureSpeaker: false,
  askBeforeCapture: true,
  extractSummary: true,
  extractDecisions: true,
  extractActionItems: true,
  extractQuestions: true,
  extractTopics: true,
};

describe('MeetingSettingsPanel', () => {
  it('renders automation, capture, and AI extraction toggles', () => {
    useMeetingSettingsMock.mockReturnValue({ data: SETTINGS });
    useCalendarStatusMock.mockReturnValue({
      data: { provider: 'mock', connected: false, readOnly: true } as CalendarStatusDTO,
    });
    renderWithProviders(<MeetingSettingsPanel />);

    expect(screen.getByLabelText(/automatic capture/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reminder \(minutes before start\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ask before local capture/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^questions$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/important topics/i)).toBeInTheDocument();
  });

  it('shows the read-only Mock calendar connection status by default', () => {
    useMeetingSettingsMock.mockReturnValue({ data: SETTINGS });
    useCalendarStatusMock.mockReturnValue({
      data: { provider: 'mock', connected: false, readOnly: true } as CalendarStatusDTO,
    });
    renderWithProviders(<MeetingSettingsPanel />);
    expect(screen.getByText(/mock \(offline\)/i)).toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it('reflects a connected Outlook calendar', () => {
    useMeetingSettingsMock.mockReturnValue({ data: SETTINGS });
    useCalendarStatusMock.mockReturnValue({
      data: { provider: 'outlook', connected: true, readOnly: true } as CalendarStatusDTO,
    });
    renderWithProviders(<MeetingSettingsPanel />);
    expect(screen.getByText(/microsoft 365 \(outlook\)/i)).toBeInTheDocument();
  });
});
