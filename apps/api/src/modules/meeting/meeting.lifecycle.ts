import type { MeetingStatus } from '@vaani/types';

/**
 * The meeting lifecycle state machine (Meeting AI automation).
 *
 * Allowed transitions (illegal jumps are rejected by the service):
 *   SCHEDULED  → NOTIFIED | STARTED | CANCELLED
 *   NOTIFIED   → STARTED | CANCELLED
 *   STARTED    → CAPTURING | PROCESSING | CANCELLED
 *   CAPTURING  → PROCESSING | CANCELLED
 *   PROCESSING → COMPLETED
 *   COMPLETED  → (terminal)
 *   CANCELLED  → (terminal)
 *
 * Kept as a pure map so it can be unit-tested with an injected `now` and without a DB.
 */
export const ALLOWED_TRANSITIONS: Record<MeetingStatus, ReadonlyArray<MeetingStatus>> = {
  SCHEDULED: ['NOTIFIED', 'STARTED', 'CANCELLED'],
  NOTIFIED: ['STARTED', 'CANCELLED'],
  STARTED: ['CAPTURING', 'PROCESSING', 'CANCELLED'],
  CAPTURING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Whether `from → to` is a legal lifecycle transition. */
export function canTransition(from: MeetingStatus, to: MeetingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Throws a descriptive error for an illegal transition (used by the service guard). */
export function assertTransition(from: MeetingStatus, to: MeetingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal meeting status transition: ${from} → ${to}`);
  }
}
