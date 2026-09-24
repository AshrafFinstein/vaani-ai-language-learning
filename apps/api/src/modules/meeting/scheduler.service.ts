import type { SchedulerTickResultDTO } from '@vaani/types';
import { prisma } from '../../prisma.js';
import { env } from '../../env.js';
import { notificationService } from '../notification/notification.service.js';

/**
 * The meeting scheduler. Invoked via an endpoint/tick (NOT an always-on timer, which
 * would break the deterministic test suite). Given `now`, it:
 *   1. NOTIFIES meetings entering the reminder window (SCHEDULED → NOTIFIED + reminder).
 *   2. STARTS meetings whose start time has passed (SCHEDULED|NOTIFIED → STARTED + notice).
 *   3. Moves ENDED meetings to PROCESSING (STARTED|CAPTURING → PROCESSING).
 *
 * `now` is injected for determinism. Each transition respects the state machine and is
 * idempotent — re-running the same tick makes no further changes.
 *
 * NOTE: This does NOT auto-start real recording/capture. Capture stays consent-gated
 * and deferred (CLAUDE.md §13–14); the scheduler only advances lifecycle *state*.
 */
export const schedulerService = {
  async tick(userId: string, now: Date = new Date()): Promise<SchedulerTickResultDTO> {
    const settings = await prisma.meetingSettings.findUnique({ where: { userId } });
    const reminderMinutes = settings?.reminderMinutes ?? env.MEETING_REMINDER_MINUTES;
    const reminderWindowEnd = new Date(now.getTime() + reminderMinutes * 60_000);

    const notified: string[] = [];
    const started: string[] = [];
    const processing: string[] = [];

    // 1. Reminder window: SCHEDULED meetings starting within [now, now+reminder] whose
    //    start has not yet passed → NOTIFIED + a MEETING_REMINDER notification.
    const toNotify = await prisma.meeting.findMany({
      where: {
        userId,
        status: 'SCHEDULED',
        scheduledStart: { gt: now, lte: reminderWindowEnd },
      },
    });
    for (const m of toNotify) {
      await prisma.meeting.update({
        where: { id: m.id },
        data: { status: 'NOTIFIED', notifiedAt: now },
      });
      const minutes = Math.max(0, Math.round((m.scheduledStart.getTime() - now.getTime()) / 60_000));
      await notificationService.create(userId, {
        type: 'MEETING_REMINDER',
        title: 'Upcoming meeting',
        body: `"${m.title}" starts in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        meetingId: m.id,
      });
      notified.push(m.id);
    }

    // 2. Detect start: SCHEDULED|NOTIFIED meetings whose start time has passed but that
    //    have not yet ended → STARTED + a MEETING_STARTED notification.
    const toStart = await prisma.meeting.findMany({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'NOTIFIED'] },
        scheduledStart: { lte: now },
        scheduledEnd: { gt: now },
      },
    });
    for (const m of toStart) {
      await prisma.meeting.update({
        where: { id: m.id },
        data: { status: 'STARTED', startedAt: m.startedAt ?? now },
      });
      await notificationService.create(userId, {
        type: 'MEETING_STARTED',
        title: 'Meeting started',
        body: `"${m.title}" has started.`,
        meetingId: m.id,
      });
      started.push(m.id);
    }

    // 3. Detect end: STARTED|CAPTURING meetings whose end time has passed → PROCESSING.
    //    The ANALYSIS_READY notification is emitted by the analysis pipeline when it
    //    completes (see runAnalysis). We do not fabricate a transcript here.
    const toProcess = await prisma.meeting.findMany({
      where: {
        userId,
        status: { in: ['STARTED', 'CAPTURING'] },
        scheduledEnd: { lte: now },
      },
    });
    for (const m of toProcess) {
      await prisma.meeting.update({
        where: { id: m.id },
        data: { status: 'PROCESSING', endedAt: m.endedAt ?? now },
      });
      processing.push(m.id);
    }

    return { notified, started, processing };
  },
};
