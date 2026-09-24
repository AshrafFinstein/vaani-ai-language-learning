import { describe, expect, it } from 'vitest';
import { UNASSIGNED_OWNER } from '@vaani/types';
import { SpeakerService, type KnownParticipant } from '../src/index.js';

const known: KnownParticipant[] = [
  { id: 'p1', name: 'Priya', email: 'priya@x.com', role: 'PM', speakerLabel: 'Speaker 1' },
  { id: 'p2', name: 'Alex', email: null, role: null, speakerLabel: 'Speaker 2' },
];

describe('SpeakerService — maps labels to participants without inventing people (§15)', () => {
  it('resolves a mapped label to the participant name + id', () => {
    const svc = new SpeakerService(known);
    const m = svc.resolve('Speaker 1');
    expect(m.mapped).toBe(true);
    expect(m.participantId).toBe('p1');
    expect(m.displayName).toBe('Priya');
  });

  it('keeps the RAW label as displayName for an unmapped speaker (never invents a name)', () => {
    const svc = new SpeakerService(known);
    const m = svc.resolve('Speaker 9');
    expect(m.mapped).toBe(false);
    expect(m.participantId).toBeNull();
    expect(m.displayName).toBe('Speaker 9');
  });

  it('attributes to Unassigned when the label maps to no known participant', () => {
    const svc = new SpeakerService(known);
    expect(svc.attribute('Speaker 9')).toBe(UNASSIGNED_OWNER);
    expect(svc.attribute('Speaker 2')).toBe('Alex');
  });

  it('mapAll de-duplicates labels and preserves order', () => {
    const svc = new SpeakerService(known);
    const out = svc.mapAll(['Speaker 2', 'Speaker 1', 'Speaker 2', 'Speaker 9']);
    expect(out.map((o) => o.speakerLabel)).toEqual(['Speaker 2', 'Speaker 1', 'Speaker 9']);
  });

  it('ignores participants without a speaker label', () => {
    const svc = new SpeakerService([
      { id: 'p3', name: 'No Label', email: null, role: null, speakerLabel: null },
    ]);
    expect(svc.resolve('Speaker 1').mapped).toBe(false);
  });
});
