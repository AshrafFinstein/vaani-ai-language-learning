import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ActionItemDTO } from '@vaani/types';
import { ActionItemsTable } from '@/features/meeting/components/ActionItemsTable';

const items: ActionItemDTO[] = [
  {
    id: 'a1',
    ordinal: 1,
    description: 'Prepare the release notes',
    owner: 'Priya',
    dueDate: '2026-10-01',
    status: 'OPEN',
    priority: 'MEDIUM',
    confidence: 0.9,
  },
  {
    id: 'a2',
    ordinal: 2,
    description: 'Investigate flaky payment tests',
    owner: 'Unassigned',
    dueDate: 'Not specified',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    confidence: 0.8,
  },
];

describe('ActionItemsTable', () => {
  it('renders the # / item / owner / status columns', () => {
    render(<ActionItemsTable items={items} />);
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders each action item with its owner, due date, and status', () => {
    render(<ActionItemsTable items={items} />);

    expect(screen.getByText('Prepare the release notes')).toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();
    expect(screen.getByText('2026-10-01')).toBeInTheDocument();

    // The unassigned/unspecified sentinels are surfaced verbatim.
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Not specified')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('shows an empty state when there are no items', () => {
    render(<ActionItemsTable items={[]} />);
    expect(screen.getByText(/no action items/i)).toBeInTheDocument();
  });

  it('places the ordinal in the first cell of a row', () => {
    render(<ActionItemsTable items={items} />);
    const row = screen.getByText('Prepare the release notes').closest('tr')!;
    expect(within(row).getByText('1')).toBeInTheDocument();
  });
});
