import type { Prisma } from '@prisma/client';
import {
  type CourseDetailDTO,
  type CourseModuleDTO,
  type CourseProgressDTO,
  type CourseSummaryDTO,
  type ExerciseDTO,
  type ExerciseResult,
  type GenerateLearningPathInput,
  type LearningPath,
  type LearningPathCatalogItem,
  type LessonDTO,
} from '@vaani/types';
import type { ChatOptions } from '@vaani/ai';
import { prisma } from '../../prisma.js';
import { ApiException } from '../../lib/errors.js';
import { getAIProvider } from '../../lib/ai.js';

type ExerciseRow = Prisma.ExerciseGetPayload<object>;

/** Exercise kinds graded deterministically by the service (no AI needed). */
const DETERMINISTIC_KINDS = new Set(['MULTIPLE_CHOICE', 'FILL_BLANK']);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toExerciseDTO(e: ExerciseRow): ExerciseDTO {
  return { id: e.id, kind: e.kind, prompt: e.prompt, options: e.options, ordinal: e.ordinal };
}

async function languageName(code: string): Promise<string | undefined> {
  const language = await prisma.language.findFirst({ where: { code } });
  return language?.name;
}

async function completedLessonIds(userId: string, lessonIds: string[]): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const rows = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true },
  });
  return new Set(rows.map((r) => r.lessonId));
}

function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export const courseService = {
  /** Lists published courses with the learner's enrollment + progress folded in. */
  async listCatalog(userId: string): Promise<CourseSummaryDTO[]> {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        modules: { include: { lessons: { select: { id: true } } } },
        enrollments: { where: { userId }, select: { id: true } },
      },
    });

    const allLessonIds = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)));
    const completed = await completedLessonIds(userId, allLessonIds);

    return courses.map((c) => {
      const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const done = lessonIds.filter((id) => completed.has(id)).length;
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        languageCode: c.languageCode,
        level: c.level,
        coverEmoji: c.coverEmoji,
        estimatedMinutes: c.estimatedMinutes,
        moduleCount: c.modules.length,
        lessonCount: lessonIds.length,
        enrolled: c.enrollments.length > 0,
        progressPercent: percent(done, lessonIds.length),
      };
    });
  },

  /** Full course detail (modules → lessons → exercises) with per-lesson completion. */
  async getCourseDetail(userId: string, slug: string): Promise<CourseDetailDTO> {
    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      include: {
        modules: {
          orderBy: { ordinal: 'asc' },
          include: {
            lessons: {
              orderBy: { ordinal: 'asc' },
              include: { exercises: { orderBy: { ordinal: 'asc' } } },
            },
          },
        },
        enrollments: { where: { userId }, select: { id: true } },
      },
    });
    if (!course) throw ApiException.notFound('Course not found');

    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completed = await completedLessonIds(userId, lessonIds);
    const doneCount = lessonIds.filter((id) => completed.has(id)).length;

    const modules: CourseModuleDTO[] = course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      ordinal: m.ordinal,
      lessons: m.lessons.map(
        (l): LessonDTO => ({
          id: l.id,
          title: l.title,
          content: l.content,
          ordinal: l.ordinal,
          estimatedMinutes: l.estimatedMinutes,
          completed: completed.has(l.id),
          exercises: l.exercises.map(toExerciseDTO),
        }),
      ),
    }));

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      languageCode: course.languageCode,
      level: course.level,
      coverEmoji: course.coverEmoji,
      estimatedMinutes: course.estimatedMinutes,
      enrolled: course.enrollments.length > 0,
      progressPercent: percent(doneCount, lessonIds.length),
      completedLessons: doneCount,
      totalLessons: lessonIds.length,
      modules,
    };
  },

  /** Enrolls the learner in a course (idempotent). */
  async enroll(userId: string, slug: string): Promise<CourseProgressDTO> {
    const course = await prisma.course.findFirst({ where: { slug, isPublished: true } });
    if (!course) throw ApiException.notFound('Course not found');

    await prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      update: {},
      create: { userId, courseId: course.id },
    });
    return this.getProgress(userId, slug);
  },

  /** Progress summary for a course (works whether or not the learner is enrolled). */
  async getProgress(userId: string, slug: string): Promise<CourseProgressDTO> {
    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      include: { modules: { include: { lessons: { select: { id: true } } } } },
    });
    if (!course) throw ApiException.notFound('Course not found');

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completed = await completedLessonIds(userId, lessonIds);
    const done = lessonIds.filter((id) => completed.has(id)).length;

    return {
      courseId: course.id,
      enrolled: Boolean(enrollment),
      status: enrollment?.status ?? null,
      completedLessons: done,
      totalLessons: lessonIds.length,
      progressPercent: percent(done, lessonIds.length),
      completedLessonIds: lessonIds.filter((id) => completed.has(id)),
    };
  },

  /**
   * Marks a lesson complete for the learner. Auto-enrolls if needed and flips the
   * enrollment to COMPLETED once every lesson in the course is done.
   */
  async completeLesson(userId: string, lessonId: string): Promise<CourseProgressDTO> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw ApiException.notFound('Lesson not found');
    const course = lesson.module.course;

    await prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      update: {},
      create: { userId, courseId: course.id },
    });
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {},
      create: { userId, lessonId },
    });
    // Record the practice activity for future progress analytics.
    await prisma.practiceSession.create({ data: { userId, kind: 'CHAT' } });

    const progress = await this.getProgress(userId, course.slug);
    if (progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons) {
      await prisma.courseEnrollment.update({
        where: { userId_courseId: { userId, courseId: course.id } },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      return { ...progress, status: 'COMPLETED' };
    }
    return progress;
  },

  /**
   * Grades a submitted exercise. Deterministic kinds (multiple-choice, fill-blank) are graded
   * by normalised match; open-ended kinds (translate, free-response) are evaluated through
   * the `@vaani/ai` abstraction and validated against the schema.
   */
  async submitExercise(
    _userId: string,
    exerciseId: string,
    answer: string,
  ): Promise<ExerciseResult> {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { lesson: { include: { module: { include: { course: true } } } } },
    });
    if (!exercise) throw ApiException.notFound('Exercise not found');

    if (DETERMINISTIC_KINDS.has(exercise.kind)) {
      const isCorrect = normalize(answer) === normalize(exercise.answer);
      return {
        isCorrect,
        correctAnswer: exercise.answer,
        feedback: isCorrect
          ? 'Correct — well done!'
          : exercise.explanation || 'Not quite. Review the lesson and try again.',
        score: isCorrect ? 100 : 0,
      };
    }

    const course = exercise.lesson.module.course;
    const name = await languageName(course.languageCode);
    const options: ChatOptions = {
      level: course.level,
      languageCode: course.languageCode,
      languageName: name,
    };
    return getAIProvider().evaluateExercise(exercise.prompt, exercise.answer, answer, options);
  },

  /** Generates an AI learning path from the catalog via the `@vaani/ai` abstraction. */
  async generateLearningPath(
    userId: string,
    input: GenerateLearningPathInput,
  ): Promise<LearningPath> {
    let languageCode = input.languageCode;
    let level = input.level;
    if (!languageCode || !level) {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      languageCode = languageCode ?? profile?.learningLanguageCode ?? undefined;
      level = level ?? profile?.level ?? undefined;
    }

    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { slug: true, title: true, level: true, languageCode: true, description: true },
    });
    const catalog: LearningPathCatalogItem[] = courses;

    const name = languageCode ? await languageName(languageCode) : undefined;
    return getAIProvider().generateLearningPath(catalog, {
      level,
      languageCode,
      languageName: name,
      goal: input.goal,
    });
  },
};
