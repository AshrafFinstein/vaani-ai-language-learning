import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

/**
 * In-memory Prisma mock covering the course service query surface. A single seeded
 * course (spanish-foundations) with one module, one lesson, and two exercises
 * (a multiple-choice and a free-response) is enough to exercise catalog, enroll,
 * complete-lesson, exercise submit (deterministic + AI), and learning-path.
 */
vi.mock('../src/prisma.js', () => {
  const COURSE = {
    id: 'course_1',
    slug: 'spanish-foundations',
    title: 'Spanish Foundations',
    description: 'Greetings and essentials.',
    languageCode: 'es',
    level: 'BEGINNER',
    coverEmoji: '🇪🇸',
    estimatedMinutes: 90,
    sortOrder: 1,
    isPublished: true,
  };
  const MODULE = {
    id: 'module_1',
    courseId: 'course_1',
    title: 'First Words',
    description: 'Greet people.',
    ordinal: 0,
  };
  const LESSON = {
    id: 'lesson_1',
    moduleId: 'module_1',
    title: 'Greetings',
    content: 'Learn hola.',
    ordinal: 0,
    estimatedMinutes: 6,
  };
  const EXERCISES = [
    {
      id: 'ex_mc',
      lessonId: 'lesson_1',
      kind: 'MULTIPLE_CHOICE',
      prompt: 'Which word means hello?',
      options: ['Adiós', 'Hola'],
      answer: 'Hola',
      explanation: 'Hola is hello.',
      ordinal: 0,
    },
    {
      id: 'ex_free',
      lessonId: 'lesson_1',
      kind: 'FREE_RESPONSE',
      prompt: 'Greet someone in Spanish.',
      options: [],
      answer: 'Hola',
      explanation: '',
      ordinal: 1,
    },
  ];

  const enrollments = new Map<string, { userId: string; courseId: string; status: string }>();
  const progress = new Set<string>(); // `${userId}:${lessonId}`
  const languages = [{ code: 'es', name: 'Spanish', isActive: true }];

  const lessonWithExercises = () => ({
    ...LESSON,
    exercises: EXERCISES.map((e) => ({ ...e })),
  });
  const moduleWithLessons = (lessonSelect: boolean) => ({
    ...MODULE,
    lessons: lessonSelect ? [{ id: LESSON.id }] : [lessonWithExercises()],
  });

  // Loose shapes for the parts of Prisma query args the service actually passes.
  type Rec = Record<string, unknown>;
  const asRec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
  const lessonSelectFrom = (include: Rec | undefined): boolean => {
    const modules = asRec(asRec(include).modules);
    const lessons = asRec(asRec(modules.include).lessons);
    return Boolean(lessons.select);
  };
  const enrollUserId = (include: Rec | undefined): string | undefined => {
    const enroll = asRec(asRec(include).enrollments);
    const where = asRec(enroll.where);
    return typeof where.userId === 'string' ? where.userId : undefined;
  };

  const prisma = {
    __reset() {
      enrollments.clear();
      progress.clear();
    },
    profile: {
      findUnique: async () => ({ learningLanguageCode: 'es', level: 'BEGINNER' }),
    },
    language: {
      findFirst: async ({ where }: { where: { code: string } }) =>
        languages.find((l) => l.code === where.code) ?? null,
    },
    practiceSession: { create: async () => ({}) },
    course: {
      findMany: async ({ include, select }: { include?: Rec; select?: Rec }) => {
        if (select) return [{ ...COURSE }];
        const userId = enrollUserId(include);
        const enrolled = userId && enrollments.has(`${userId}:${COURSE.id}`) ? [{ id: 'e' }] : [];
        return [
          {
            ...COURSE,
            modules: [moduleWithLessons(lessonSelectFrom(include))],
            enrollments: enrolled,
          },
        ];
      },
      findFirst: async ({ where, include }: { where: { slug: string }; include?: Rec }) => {
        if (where.slug !== COURSE.slug) return null;
        const base: Record<string, unknown> = { ...COURSE };
        if (include?.modules) {
          base.modules = [moduleWithLessons(lessonSelectFrom(include))];
        }
        if (include?.enrollments) {
          const userId = enrollUserId(include) ?? '';
          base.enrollments = enrollments.has(`${userId}:${COURSE.id}`) ? [{ id: 'e' }] : [];
        }
        return base;
      },
    },
    courseEnrollment: {
      upsert: async ({
        where,
      }: {
        where: { userId_courseId: { userId: string; courseId: string } };
      }) => {
        const { userId, courseId } = where.userId_courseId;
        const key = `${userId}:${courseId}`;
        if (!enrollments.has(key)) enrollments.set(key, { userId, courseId, status: 'ACTIVE' });
        return enrollments.get(key)!;
      },
      findUnique: async ({
        where,
      }: {
        where: { userId_courseId: { userId: string; courseId: string } };
      }) => enrollments.get(`${where.userId_courseId.userId}:${where.userId_courseId.courseId}`) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { userId_courseId: { userId: string; courseId: string } };
        data: Record<string, unknown>;
      }) => {
        const key = `${where.userId_courseId.userId}:${where.userId_courseId.courseId}`;
        const e = enrollments.get(key)!;
        Object.assign(e, data);
        return e;
      },
    },
    lesson: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === LESSON.id
          ? { ...LESSON, module: { ...MODULE, course: { ...COURSE } } }
          : null,
    },
    lessonProgress: {
      findMany: async ({ where }: { where: { userId: string; lessonId: { in: string[] } } }) =>
        where.lessonId.in
          .filter((id) => progress.has(`${where.userId}:${id}`))
          .map((id) => ({ lessonId: id })),
      upsert: async ({
        where,
      }: {
        where: { userId_lessonId: { userId: string; lessonId: string } };
      }) => {
        progress.add(`${where.userId_lessonId.userId}:${where.userId_lessonId.lessonId}`);
        return {};
      },
    },
    exercise: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const ex = EXERCISES.find((e) => e.id === where.id);
        if (!ex) return null;
        return { ...ex, lesson: { ...LESSON, module: { ...MODULE, course: { ...COURSE } } } };
      },
    },
  };

  return { prisma };
});

const { createApp } = await import('../src/app.js');
const { signAccessToken } = await import('../src/lib/tokens.js');
const { prisma } = (await import('../src/prisma.js')) as unknown as {
  prisma: { __reset: () => void };
};

const app = createApp();
const token = signAccessToken({ sub: 'user_1', role: 'USER' });
const COOKIE = [`vaani_access=${token}`];
const auth = {
  get: (url: string) => request(app).get(url).set('Cookie', COOKIE),
  post: (url: string) => request(app).post(url).set('Cookie', COOKIE),
};

beforeEach(() => prisma.__reset());

describe('GET /api/courses (catalog)', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(401);
  });

  it('lists published courses with progress folded in', async () => {
    const res = await auth.get('/api/courses');
    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(1);
    expect(res.body.data.courses[0]).toMatchObject({
      slug: 'spanish-foundations',
      enrolled: false,
      progressPercent: 0,
      lessonCount: 1,
    });
  });
});

describe('POST /api/courses/enroll', () => {
  it('enrolls the learner and returns progress', async () => {
    const res = await auth.post('/api/courses/enroll').send({ slug: 'spanish-foundations' });
    expect(res.status).toBe(201);
    expect(res.body.data.progress).toMatchObject({ enrolled: true, totalLessons: 1 });
  });

  it('404s for an unknown course', async () => {
    const res = await auth.post('/api/courses/enroll').send({ slug: 'nope' });
    expect(res.status).toBe(404);
  });

  it('validates the body (422)', async () => {
    const res = await auth.post('/api/courses/enroll').send({});
    expect(res.status).toBe(422);
  });
});

describe('course detail + lesson completion', () => {
  it('returns the module/lesson/exercise tree', async () => {
    const res = await auth.get('/api/courses/spanish-foundations');
    expect(res.status).toBe(200);
    expect(res.body.data.course.modules[0].lessons[0].exercises).toHaveLength(2);
    // The canonical answer is never leaked to the client.
    expect(res.body.data.course.modules[0].lessons[0].exercises[0]).not.toHaveProperty('answer');
  });

  it('completes a lesson and reflects 100% progress', async () => {
    const res = await auth.post('/api/courses/lessons/lesson_1/complete');
    expect(res.status).toBe(200);
    expect(res.body.data.progress).toMatchObject({
      completedLessons: 1,
      totalLessons: 1,
      progressPercent: 100,
      status: 'COMPLETED',
    });
  });
});

describe('POST /api/courses/exercises/:id/submit', () => {
  it('grades a correct multiple-choice answer deterministically', async () => {
    const res = await auth.post('/api/courses/exercises/ex_mc/submit').send({ answer: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.data.result).toMatchObject({ isCorrect: true, score: 100 });
  });

  it('grades a wrong multiple-choice answer', async () => {
    const res = await auth.post('/api/courses/exercises/ex_mc/submit').send({ answer: 'Adiós' });
    expect(res.status).toBe(200);
    expect(res.body.data.result.isCorrect).toBe(false);
  });

  it('evaluates a free-response answer via the AI abstraction', async () => {
    const res = await auth.post('/api/courses/exercises/ex_free/submit').send({ answer: 'Hola' });
    expect(res.status).toBe(200);
    expect(res.body.data.result.isCorrect).toBe(true);
    expect(res.body.data.result.score).toBeGreaterThanOrEqual(0);
    expect(res.body.data.result.score).toBeLessThanOrEqual(100);
  });

  it('validates the answer body (422)', async () => {
    const res = await auth.post('/api/courses/exercises/ex_mc/submit').send({});
    expect(res.status).toBe(422);
  });
});

describe('POST /api/courses/learning-path', () => {
  it('generates a schema-valid path referencing real course slugs', async () => {
    const res = await auth.post('/api/courses/learning-path').send({ goal: 'travel' });
    expect(res.status).toBe(200);
    expect(res.body.data.path.summary).toBeTruthy();
    for (const step of res.body.data.path.steps) {
      expect(step.courseSlug).toBe('spanish-foundations');
    }
  });
});
