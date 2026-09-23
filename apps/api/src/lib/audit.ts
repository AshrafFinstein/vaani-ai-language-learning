import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

/**
 * Canonical audit action verbs. Sensitive meeting actions are audited so that
 * recording/transcript access and deletion leave a forensic trail (Phase 11
 * security requirement). Keep this list explicit — it's the vocabulary a reviewer
 * greps for.
 */
export type AuditAction =
  | 'RECORDING_START'
  | 'RECORDING_STOP'
  | 'TRANSCRIPT_ACCESS'
  | 'RECORDING_DELETE'
  | 'TRANSCRIPT_DELETE';

/** The kind of resource an audited action targeted. */
export type AuditTargetType = 'MEETING' | 'RECORDING' | 'TRANSCRIPT';

/**
 * Appends an audit record for a sensitive action.
 *
 * We deliberately log only *references* — who (`userId`), what (`action`), and which
 * resource (`targetType` + `targetId`) — plus optional small, non-sensitive
 * `metadata` (e.g. a state transition). We NEVER log secrets, tokens, audio, or
 * transcript content (CLAUDE.md §10).
 *
 * Auditing is best-effort with respect to the caller: a failure to write the audit
 * row must never break the underlying action, so errors are swallowed. `now` is
 * injectable to keep time-sensitive tests deterministic.
 */
export async function recordAudit(
  userId: string,
  action: AuditAction,
  targetType: AuditTargetType,
  targetId: string,
  metadata?: Prisma.InputJsonValue,
  now: Date = new Date(),
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetType,
        targetId,
        metadata,
        createdAt: now,
      },
    });
  } catch {
    // Audit recording is best-effort; never surface it to the caller.
  }
}
