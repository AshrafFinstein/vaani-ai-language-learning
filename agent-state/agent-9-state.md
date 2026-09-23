# Agent 9 — Courses

## Phase
P9

## Status
DONE (on feature/phase-9-courses; awaiting Coordinator gate + merge)

## Completed
- Prisma: added `Course`, `CourseModule`, `Lesson`, `Exercise`, `CourseEnrollment`,
  `LessonProgress` models + `ExerciseKind` / `EnrollmentStatus` enums, related to `User`.
  Migration `20260922100000_add_courses`. Seeded 3 sample courses (es/fr/en) with
  modules → lessons → exercises. `npm run db:generate` run.
- `@vaani/types`: `course.ts` — Zod schemas + inferred types (CourseSummaryDTO,
  CourseDetailDTO, CourseModuleDTO, LessonDTO, ExerciseDTO, CourseProgressDTO,
  EnrollCourseInput, SubmitExerciseInput, ExerciseResultSchema, LearningPathSchema,
  GenerateLearningPathInput, LearningPathCatalogItem). Exported from index.
- `@vaani/ai`: added `evaluateExercise` and `generateLearningPath` to the `AIProvider`
  interface, implemented in BOTH `MockAIProvider` (deterministic, no network) and
  `OpenAIProvider`. Added `buildExerciseEvalPrompt` + `buildLearningPathPrompt`.
- API: `apps/api/src/modules/course/` (route→controller→service→prisma) registered at
  `/api/courses`: catalog, detail, enroll, progress, complete-lesson, submit-exercise
  (deterministic for MC/fill-blank; AI abstraction for translate/free-response),
  generate learning-path (AI abstraction). Zod validation + requireAuth like other modules.
- Web: `features/courses/` (api client, hooks, CourseCatalog, ExerciseCard,
  LearningPathPanel), pages `Courses.tsx` + `CourseDetail.tsx`, routes registered in
  App.tsx, `Courses` nav item marked `ready: true`.
- Tests: api supertest `course.test.ts` (12) covering catalog/enroll/detail/complete/
  submit (deterministic + AI)/learning-path; `ai-provider.test.ts` extended with mock
  learning-path + exercise grading tests; web RTL `CourseCatalog.test.tsx`.

## Gate (from worktree root)
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0 (0 warnings)
- `npm run test` → exit 0 (meeting 6, api 80, web 29 = 115 tests)

## Blockers
None.

## Next Step
Coordinator review + merge into develop.

## Deferred
- No live DB migration applied (no DB in this env); migration SQL authored to match the
  existing hand-written migration convention.
- Exercise submissions are graded but attempt results are not persisted per-user (out of
  scope for this phase); lesson completion + enrollment progress ARE persisted.
