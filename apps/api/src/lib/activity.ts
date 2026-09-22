import type { ActivityKind } from '@prisma/client';
import { prisma } from '../prisma.js';

/**
 * Fixed, deterministic minutes + XP credited per activity kind when it completes.
 * These are small, believable amounts (not real captured durations) so real progress
 * accrues from actual usage without instrumenting timers into every feature. Kept
 * deterministic (no RNG) so tests are reproducible.
 */
const ACTIVITY_CREDIT: Record<ActivityKind, { minutes: number; xp: number }> = {
  CHAT: { minutes: 3, xp: 10 },
  ROLEPLAY: { minutes: 4, xp: 12 },
  CALL: { minutes: 5, xp: 15 },
  DIALOGUE: { minutes: 3, xp: 10 },
  WORD: { minutes: 1, xp: 4 },
  SENTENCE: { minutes: 2, xp: 6 },
  FLASHCARD: { minutes: 1, xp: 4 },
  COURSE: { minutes: 5, xp: 20 },
  DEBATE: { minutes: 5, xp: 18 },
  PHOTO: { minutes: 3, xp: 10 },
  CHARACTER: { minutes: 3, xp: 10 },
  SCENARIO: { minutes: 3, xp: 10 },
  MEETING: { minutes: 10, xp: 25 },
};

/**
 * Records that a learning activity completed. Feature services call this at the natural
 * completion point of an activity (message sent, card reviewed, lesson completed, meeting
 * analyzed, …). Recording is best-effort: a failure here must never break the feature that
 * triggered it, so errors are swallowed. Aggregation happens in the progress service.
 *
 * `now` is injectable so time-sensitive tests stay deterministic.
 */
export async function recordActivity(
  userId: string,
  kind: ActivityKind,
  now: Date = new Date(),
): Promise<void> {
  const credit = ACTIVITY_CREDIT[kind];
  try {
    await prisma.activityEvent.create({
      data: {
        userId,
        kind,
        minutes: credit.minutes,
        xp: credit.xp,
        createdAt: now,
      },
    });
  } catch {
    // Analytics recording is non-critical; never surface it to the caller.
  }
}

export { ACTIVITY_CREDIT };
