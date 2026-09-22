import { z } from 'zod';
import { LearningLevel } from './common.js';

/**
 * Courses (Phase 9, master plan §17). A course groups modules → lessons → exercises.
 * Learners enroll to track progress, complete lessons, submit exercises (graded either
 * deterministically or via the `@vaani/ai` abstraction), and can generate an AI learning
 * path recommending an ordered set of courses. All course content is original Vaani AI
 * material. These schemas are the single source of truth for request/response shapes.
 */

export const ExerciseKind = z.enum([
  'MULTIPLE_CHOICE',
  'FILL_BLANK',
  'TRANSLATE',
  'FREE_RESPONSE',
]);
export type ExerciseKind = z.infer<typeof ExerciseKind>;

export const EnrollmentStatus = z.enum(['ACTIVE', 'COMPLETED']);
export type EnrollmentStatus = z.infer<typeof EnrollmentStatus>;

/** A catalog item — the summary shown in the course list. */
export const CourseSummaryDTO = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  languageCode: z.string(),
  level: LearningLevel,
  coverEmoji: z.string(),
  estimatedMinutes: z.number().int(),
  moduleCount: z.number().int(),
  lessonCount: z.number().int(),
  /** True when the current learner is enrolled in this course. */
  enrolled: z.boolean(),
  /** 0–100 completion percentage for the current learner (0 when not enrolled). */
  progressPercent: z.number().int().min(0).max(100),
});
export type CourseSummaryDTO = z.infer<typeof CourseSummaryDTO>;

/** An exercise as shown to the learner. The canonical answer is NEVER included here. */
export const ExerciseDTO = z.object({
  id: z.string(),
  kind: ExerciseKind,
  prompt: z.string(),
  options: z.array(z.string()),
  ordinal: z.number().int(),
});
export type ExerciseDTO = z.infer<typeof ExerciseDTO>;

/** A lesson with its exercises and the learner's completion state. */
export const LessonDTO = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  ordinal: z.number().int(),
  estimatedMinutes: z.number().int(),
  completed: z.boolean(),
  exercises: z.array(ExerciseDTO),
});
export type LessonDTO = z.infer<typeof LessonDTO>;

/** A module with its ordered lessons. */
export const CourseModuleDTO = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  ordinal: z.number().int(),
  lessons: z.array(LessonDTO),
});
export type CourseModuleDTO = z.infer<typeof CourseModuleDTO>;

/** Full course detail: modules → lessons → exercises, plus the learner's progress. */
export const CourseDetailDTO = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  languageCode: z.string(),
  level: LearningLevel,
  coverEmoji: z.string(),
  estimatedMinutes: z.number().int(),
  enrolled: z.boolean(),
  progressPercent: z.number().int().min(0).max(100),
  completedLessons: z.number().int(),
  totalLessons: z.number().int(),
  modules: z.array(CourseModuleDTO),
});
export type CourseDetailDTO = z.infer<typeof CourseDetailDTO>;

/** Progress summary for an enrolled course. */
export const CourseProgressDTO = z.object({
  courseId: z.string(),
  enrolled: z.boolean(),
  status: EnrollmentStatus.nullable(),
  completedLessons: z.number().int(),
  totalLessons: z.number().int(),
  progressPercent: z.number().int().min(0).max(100),
  completedLessonIds: z.array(z.string()),
});
export type CourseProgressDTO = z.infer<typeof CourseProgressDTO>;

/** Enroll in a course by slug. */
export const EnrollCourseInput = z.object({
  slug: z.string().min(1, 'Choose a course'),
});
export type EnrollCourseInput = z.infer<typeof EnrollCourseInput>;

/** Submit an answer to one exercise for evaluation. */
export const SubmitExerciseInput = z.object({
  answer: z.string().min(1, 'Enter an answer').max(2000),
});
export type SubmitExerciseInput = z.infer<typeof SubmitExerciseInput>;

const score = z.number().min(0).max(100);

/**
 * Result of grading a submitted exercise. Deterministic kinds (multiple-choice, fill-blank)
 * are graded by exact/normalised match; open-ended kinds (translate, free-response) are
 * evaluated through the `@vaani/ai` abstraction and ALWAYS validated against this schema.
 */
export const ExerciseResultSchema = z.object({
  isCorrect: z.boolean(),
  /** The canonical/expected answer, revealed after grading. */
  correctAnswer: z.string(),
  /** Short, encouraging explanation or tip. */
  feedback: z.string(),
  score: score.default(0),
});
export type ExerciseResult = z.infer<typeof ExerciseResultSchema>;

/** A single recommended step in an AI-generated learning path. */
export const LearningPathStepSchema = z.object({
  courseSlug: z.string(),
  title: z.string(),
  reason: z.string(),
});
export type LearningPathStep = z.infer<typeof LearningPathStepSchema>;

/**
 * An AI-generated learning path (Phase 9). Produced by the `@vaani/ai` abstraction from the
 * learner's level, goal, and the available catalog. ALWAYS validated against this schema.
 */
export const LearningPathSchema = z.object({
  summary: z.string(),
  steps: z.array(LearningPathStepSchema).default([]),
});
export type LearningPath = z.infer<typeof LearningPathSchema>;

/** Input to generate a learning path. */
export const GenerateLearningPathInput = z.object({
  level: LearningLevel.optional(),
  languageCode: z.string().min(2).max(10).optional(),
  goal: z.string().max(300).optional(),
});
export type GenerateLearningPathInput = z.infer<typeof GenerateLearningPathInput>;

/** A minimal catalog entry passed to the AI so it can recommend real, existing courses. */
export interface LearningPathCatalogItem {
  slug: string;
  title: string;
  level: LearningLevel;
  languageCode: string;
  description: string;
}
