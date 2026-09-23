import { UNASSIGNED_OWNER } from '@vaani/types';
import type { KnownParticipant } from './types.js';

export interface SpeakerMappingParticipant {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  speakerLabel: string | null;
}

/** The resolution of one transcript speaker label to a participant (or Unassigned). */
export interface SpeakerMapping {
  speakerLabel: string;
  /** The mapped participant id, or null when the label maps to no known participant. */
  participantId: string | null;
  /** The display name: the participant's name, else the raw label (never invented). */
  displayName: string;
  /** True when this label maps to a scheduled participant. */
  mapped: boolean;
}

/**
 * Maps transcript speaker labels to meeting participants. It NEVER invents a person
 * (CLAUDE.md §15): a label that matches no scheduled participant keeps its RAW label
 * as the display name (so "Speaker 3" stays "Speaker 3"), and attribution helpers
 * return the {@link UNASSIGNED_OWNER} sentinel rather than a fabricated identity.
 *
 * Matching is by explicit `speakerLabel` on the participant only — no fuzzy/name
 * guessing, so the mapping is deterministic and evidence-based.
 */
export class SpeakerService {
  private readonly byLabel = new Map<string, SpeakerMappingParticipant>();

  constructor(participants: ReadonlyArray<KnownParticipant | SpeakerMappingParticipant>) {
    for (const p of participants) {
      if (p.speakerLabel && p.name.trim()) {
        this.byLabel.set(p.speakerLabel, {
          id: p.id,
          name: p.name.trim(),
          email: p.email,
          role: p.role,
          speakerLabel: p.speakerLabel,
        });
      }
    }
  }

  /** Resolves one speaker label; unmapped labels keep their raw label as displayName. */
  resolve(speakerLabel: string): SpeakerMapping {
    const p = this.byLabel.get(speakerLabel);
    if (p) {
      return { speakerLabel, participantId: p.id, displayName: p.name, mapped: true };
    }
    return { speakerLabel, participantId: null, displayName: speakerLabel, mapped: false };
  }

  /**
   * Attribution helper: the participant name when the label maps to one, else the
   * `Unassigned` sentinel — never the raw label masquerading as a real person.
   */
  attribute(speakerLabel: string): string {
    return this.byLabel.get(speakerLabel)?.name ?? UNASSIGNED_OWNER;
  }

  /** Maps every distinct label appearing across the given labels (order-preserving). */
  mapAll(speakerLabels: readonly string[]): SpeakerMapping[] {
    const seen = new Set<string>();
    const out: SpeakerMapping[] = [];
    for (const label of speakerLabels) {
      if (seen.has(label)) continue;
      seen.add(label);
      out.push(this.resolve(label));
    }
    return out;
  }
}
