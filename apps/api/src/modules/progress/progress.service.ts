import type {
  AchievementDTO,
  AchievementsResponseDTO,
  DailyFeedbackDTO,
  LearningLevel,
  ProgressSummaryDTO,
} from '@vaani/types';
import type { ProgressSnapshot } from '@vaani/ai';
import { prisma } from '../../prisma.js';
import { getAIProvider } from '../../lib/ai.js';
import {
  currentStreak,
  levelFromXp,
  longestStreak,
  minutesInTrailingWeek,
  minutesOnDay,
  sessionCounts,
  topActivityKinds,
  totalXp,
  weeklySeries,
  type ActivityRow,
} from './progress.helpers.js';
import { ACHIEVEMENTS } from './achievements.js';

async function loadActivity(userId: string): Promise<ActivityRow[]> {
  const rows = await prisma.activityEvent.findMany({
    where: { userId },
    select: { kind: true, minutes: true, xp: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows as ActivityRow[];
}

/** Overall course-completion metrics across the learner's enrollments. */
async function courseMetrics(
  userId: string,
): Promise<{ completionPercent: number; completed: number; enrolled: number }> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: { modules: { include: { lessons: { select: { id: true } } } } },
      },
    },
  });
  if (enrollments.length === 0) return { completionPercent: 0, completed: 0, enrolled: 0 };

  const allLessonIds = enrollments.flatMap((e) =>
    e.course.modules.flatMap((m) => m.lessons.map((l) => l.id)),
  );
  const doneRows =
    allLessonIds.length > 0
      ? await prisma.lessonProgress.findMany({
          where: { userId, lessonId: { in: allLessonIds } },
          select: { lessonId: true },
        })
      : [];
  const done = new Set(doneRows.map((r) => r.lessonId));

  const totalLessons = allLessonIds.length;
  const doneLessons = allLessonIds.filter((id) => done.has(id)).length;
  const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;

  return {
    completionPercent: totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 100),
    completed,
    enrolled: enrollments.length,
  };
}

export const progressService = {
  /** Computes the full progress summary for a learner. `now` is injectable for tests. */
  async getSummary(userId: string, now: Date = new Date()): Promise<ProgressSummaryDTO> {
    const [events, profile, flashcardsReviewed, actionItemCount, courses] = await Promise.all([
      loadActivity(userId),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.flashcardReview.count({ where: { userId } }),
      prisma.actionItem.count({ where: { meeting: { userId } } }),
      courseMetrics(userId),
    ]);

    const counts = sessionCounts(events);
    const xp = totalXp(events);
    const levelInfo = levelFromXp(xp);
    const weekly = weeklySeries(events, now);

    const conversationCount = counts.chat + counts.character;

    return {
      totalMinutes: events.reduce((sum, e) => sum + e.minutes, 0),
      minutesToday: minutesOnDay(events, now),
      weeklyMinutes: minutesInTrailingWeek(events, now),
      dailyGoalMinutes: profile?.dailyGoalMinutes ?? 30,
      xp,
      level: levelInfo.level,
      levelLabel: levelInfo.levelLabel,
      learningLevel: (profile?.level ?? 'BEGINNER') as LearningLevel,
      xpToNextLevel: levelInfo.xpToNextLevel,
      currentStreak: currentStreak(events, now),
      longestStreak: longestStreak(events),
      totalSessions: events.length,
      sessionCounts: counts,
      conversationCount,
      roleplayCount: counts.roleplay,
      callCount: counts.call,
      meetingCount: counts.meeting,
      actionItemCount,
      flashcardsReviewed,
      courseCompletionPercent: courses.completionPercent,
      coursesCompleted: courses.completed,
      coursesEnrolled: courses.enrolled,
      weekly,
    };
  },

  /**
   * Produces a short daily-feedback payload. Summarization goes through the `@vaani/ai`
   * abstraction (deterministic mock in dev/tests). `now` is injectable for tests.
   */
  async getDailyFeedback(userId: string, now: Date = new Date()): Promise<DailyFeedbackDTO> {
    const summary = await this.getSummary(userId, now);
    let languageName: string | undefined;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (profile?.learningLanguageCode) {
      const language = await prisma.language.findFirst({
        where: { code: profile.learningLanguageCode },
        select: { name: true },
      });
      languageName = language?.name;
    }

    const snapshot: ProgressSnapshot = {
      minutesToday: summary.minutesToday,
      weeklyMinutes: summary.weeklyMinutes,
      currentStreak: summary.currentStreak,
      totalSessions: summary.totalSessions,
      flashcardsReviewed: summary.flashcardsReviewed,
      conversationCount: summary.conversationCount,
      courseCompletionPercent: summary.courseCompletionPercent,
      dailyGoalMinutes: summary.dailyGoalMinutes,
      languageName,
      topActivities: topActivityKinds(summary.sessionCounts),
    };

    return getAIProvider().summarizeProgress(snapshot, { languageName });
  },

  /**
   * Returns the learner's achievements split into earned + available. Newly-satisfied
   * achievements are persisted (unlockedAt set) idempotently so unlock times stick.
   * `now` is injectable for tests.
   */
  async getAchievements(userId: string, now: Date = new Date()): Promise<AchievementsResponseDTO> {
    const summary = await this.getSummary(userId, now);

    const existing = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: { select: { code: true } } },
    });
    const unlockedAtByCode = new Map(
      existing.map((u) => [u.achievement.code, u.unlockedAt]),
    );

    // Persist any newly-satisfied achievements (best-effort; requires the seeded definition row).
    const newlyUnlocked = ACHIEVEMENTS.filter(
      (a) => a.isUnlocked(summary) && !unlockedAtByCode.has(a.code),
    );
    for (const def of newlyUnlocked) {
      try {
        const row = await prisma.achievement.findUnique({ where: { code: def.code } });
        if (!row) continue;
        const created = await prisma.userAchievement.upsert({
          where: { userId_achievementId: { userId, achievementId: row.id } },
          create: { userId, achievementId: row.id, unlockedAt: now },
          update: {},
        });
        unlockedAtByCode.set(def.code, created.unlockedAt);
      } catch {
        // Non-critical; unlock will be retried on the next request.
      }
    }

    const earned: AchievementDTO[] = [];
    const available: AchievementDTO[] = [];
    for (const def of ACHIEVEMENTS) {
      const unlockedAt = unlockedAtByCode.get(def.code) ?? null;
      const unlocked = unlockedAt !== null || def.isUnlocked(summary);
      const dto: AchievementDTO = {
        code: def.code,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlocked,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
      };
      if (unlocked) earned.push(dto);
      else available.push(dto);
    }

    return { earned, available };
  },
};
