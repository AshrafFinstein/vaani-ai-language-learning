import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ScheduleMeetingInput } from '@vaani/types';
import { ScheduleForm } from '@/features/meeting/components/ScheduleForm';
import { renderWithProviders } from './test-utils';

describe('ScheduleForm', () => {
  it('renders the core scheduling fields and toggles', () => {
    renderWithProviders(<ScheduleForm onSubmit={() => {}} />);

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Start time')).toBeInTheDocument();
    expect(screen.getByLabelText('End time')).toBeInTheDocument();
    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Teams meeting link (optional)')).toBeInTheDocument();
    expect(screen.getByText('Enable recording')).toBeInTheDocument();
    expect(screen.getByText('Enable transcription')).toBeInTheDocument();
    expect(screen.getByText('Enable AI analysis')).toBeInTheDocument();
    // Three feature toggles plus the participant rows are checkboxes.
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThanOrEqual(3);
  });

  it('shows a validation error and does not submit when the title is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<ScheduleForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /schedule meeting/i }));

    expect(await screen.findByText(/give the meeting a title/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid schedule payload with a participant', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: ScheduleMeetingInput) => void>();
    renderWithProviders(<ScheduleForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Title'), 'Sprint planning');
    await user.type(screen.getByLabelText('Date'), '2026-10-01');
    await user.clear(screen.getByLabelText('Start time'));
    await user.type(screen.getByLabelText('Start time'), '10:00');
    await user.clear(screen.getByLabelText('End time'));
    await user.type(screen.getByLabelText('End time'), '11:00');
    await user.type(screen.getByLabelText('Participant 1 name'), 'Priya');

    await user.click(screen.getByRole('button', { name: /schedule meeting/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload).toMatchObject({
      title: 'Sprint planning',
      startTime: '10:00',
      endTime: '11:00',
      participants: [{ name: 'Priya' }],
    });
  });

  it('includes a pasted Teams link in the submitted payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: ScheduleMeetingInput) => void>();
    renderWithProviders(<ScheduleForm onSubmit={onSubmit} />);

    const joinUrl =
      'https://teams.microsoft.com/l/chat/19:meeting_ZDcwABC@thread.v2/conversations?ctx=chat';
    await user.type(screen.getByLabelText('Title'), 'Sprint planning');
    await user.type(screen.getByLabelText('Date'), '2026-10-01');
    await user.type(screen.getByLabelText('Teams meeting link (optional)'), joinUrl);

    await user.click(screen.getByRole('button', { name: /schedule meeting/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ joinUrl });
  });
});
