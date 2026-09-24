import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  assertTransition,
} from '../src/modules/meeting/meeting.lifecycle.js';
import type { MeetingStatus } from '@vaani/types';

const ALL: MeetingStatus[] = [
  'SCHEDULED',
  'NOTIFIED',
  'STARTED',
  'CAPTURING',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
];

describe('Meeting lifecycle state machine — valid transitions', () => {
  it('allows the documented forward path SCHEDULED→NOTIFIED→STARTED→CAPTURING→PROCESSING→COMPLETED', () => {
    expect(canTransition('SCHEDULED', 'NOTIFIED')).toBe(true);
    expect(canTransition('NOTIFIED', 'STARTED')).toBe(true);
    expect(canTransition('STARTED', 'CAPTURING')).toBe(true);
    expect(canTransition('CAPTURING', 'PROCESSING')).toBe(true);
    expect(canTransition('PROCESSING', 'COMPLETED')).toBe(true);
  });

  it('allows STARTED→PROCESSING (skip capture) and SCHEDULED→STARTED (no reminder)', () => {
    expect(canTransition('STARTED', 'PROCESSING')).toBe(true);
    expect(canTransition('SCHEDULED', 'STARTED')).toBe(true);
  });

  it('allows CANCELLED from any non-terminal state', () => {
    for (const s of ['SCHEDULED', 'NOTIFIED', 'STARTED', 'CAPTURING'] as MeetingStatus[]) {
      expect(canTransition(s, 'CANCELLED')).toBe(true);
    }
  });
});

describe('Meeting lifecycle state machine — rejected transitions', () => {
  it('rejects illegal backward / skip jumps', () => {
    expect(canTransition('COMPLETED', 'SCHEDULED')).toBe(false);
    expect(canTransition('PROCESSING', 'STARTED')).toBe(false);
    expect(canTransition('SCHEDULED', 'COMPLETED')).toBe(false);
    expect(canTransition('NOTIFIED', 'PROCESSING')).toBe(false);
    expect(canTransition('CANCELLED', 'STARTED')).toBe(false);
  });

  it('terminal states allow no outgoing transitions', () => {
    expect(ALLOWED_TRANSITIONS.COMPLETED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('assertTransition throws on an illegal transition and is silent on a legal one', () => {
    expect(() => assertTransition('SCHEDULED', 'COMPLETED')).toThrow(/Illegal/);
    expect(() => assertTransition('SCHEDULED', 'NOTIFIED')).not.toThrow();
  });

  it('every state has an entry in the transition map', () => {
    for (const s of ALL) {
      expect(ALLOWED_TRANSITIONS[s]).toBeDefined();
    }
  });
});
