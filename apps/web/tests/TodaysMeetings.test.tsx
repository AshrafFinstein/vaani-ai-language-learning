import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { MeetingSummaryListDTO } from '@vaani/types';
import {
  TodaysMeetings,
  countdownLabel,
} from '@/features/meeting/components/TodaysMeetings';
import { renderWithProviders } from './test-utils';

const useMeetingsMock = vi.fn();
vi.mock('@/features/meeting/useMeetings', () => ({
  useMeetings: () => useMeetingsMock(),
  useCalendarSync: () => ({ mutate: vi.fn(), isPending: false }),
  useSchedulerTick: () => ({ mutate: vi.fn(), isPending: false }),
}));

function meeting(overrides: Partial<MeetingSummaryListDTO>): MeetingSummaryListDTO {
  const now = new Date();
  return {
    id: 'm_1',
    title: 'Weekly Team Sync',
    provider: 'TEAMS',
    scheduledStart: new Date(now.getTime() + 8 * 60_000).toISOString(),
    scheduledEnd: new Date(now.getTime() + 38 * 60_000).toISOString(),
    recordingEnabled: false,
    transcriptionEnabled: false,
    aiAnalysisEnabled: true,
    analysisStatus: 'PENDING',
    status: 'SCHEDULED',
    teamsMeetingId: null,
    joinUrl: null,
    externalCalendarId: null,
    notifiedAt: null,
    startedAt: null,
    endedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    participantCount: 2,
    actionItemCount: 0,
    recordingState: 'IDLE',
    ...overrides,
  };
}

describe('countdownLabel', () => {
  const start = '2026-10-01T10:00:00.000Z';
  const end = '2026-10-01T10:30:00.000Z';

  it('shows "starts in N min" before the meeting', () => {
    expect(countdownLabel(start, end, new Date('2026-10-01T09:52:00.000Z'))).toBe('starts in 8 min');
  });

  it('shows "in progress" during the meeting', () => {
    expect(countdownLabel(start, end, new Date('2026-10-01T10:10:00.000Z'))).toBe('in progress');
  });

  it('shows "ended" after the meeting', () => {
    expect(countdownLabel(start, end, new Date('2026-10-01T11:00:00.000Z'))).toBe('ended');
  });
});

describe('TodaysMeetings', () => {
  it("renders today's meeting with a countdown and status badge", () => {
    useMeetingsMock.mockReturnValue({ data: [meeting({})], isLoading: false });
    renderWithProviders(<TodaysMeetings />);
    expect(screen.getByText('Weekly Team Sync')).toBeInTheDocument();
    expect(screen.getByText(/starts in/i)).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('shows a Capturing badge for a capturing meeting', () => {
    useMeetingsMock.mockReturnValue({ data: [meeting({ status: 'CAPTURING' })], isLoading: false });
    renderWithProviders(<TodaysMeetings />);
    expect(screen.getByText('Capturing')).toBeInTheDocument();
  });

  it('shows an empty state when there are no meetings today', () => {
    useMeetingsMock.mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<TodaysMeetings />);
    expect(screen.getByText(/no meetings today/i)).toBeInTheDocument();
  });
});
