import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Lock } from 'lucide-react';
import type { LessonDTO } from '@vaani/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ExerciseCard } from '@/features/courses/ExerciseCard';
import {
  useCourseDetail,
  useCompleteLesson,
  useEnrollCourse,
} from '@/features/courses/useCourses';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper int.',
  ADVANCED: 'Advanced',
};

function LessonView({
  lesson,
  slug,
  enrolled,
}: {
  lesson: LessonDTO;
  slug: string;
  enrolled: boolean;
}) {
  const complete = useCompleteLesson(slug);

  return (
    <div className="space-y-4 border-t px-4 py-4">
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {lesson.content}
      </p>

      {lesson.exercises.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Exercises</h4>
          {lesson.exercises.map((exercise, i) => (
            <ExerciseCard key={exercise.id} exercise={exercise} index={i} />
          ))}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant={lesson.completed ? 'secondary' : 'default'}
        disabled={complete.isPending || lesson.completed}
        onClick={() => complete.mutate(lesson.id)}
      >
        {lesson.completed
          ? 'Completed'
          : complete.isPending
            ? 'Saving…'
            : enrolled
              ? 'Mark lesson complete'
              : 'Complete lesson & enroll'}
      </Button>
    </div>
  );
}

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useCourseDetail(slug);
  const enroll = useEnrollCourse(slug);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const course = data?.course;
  if (!course) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <p className="text-muted-foreground">Course not found.</p>
        <Button asChild variant="outline">
          <Link to="/app/courses">Back to courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to courses">
          <Link to="/app/courses">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">Courses</span>
      </div>

      <header className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">
              {course.coverEmoji}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
              <p className="text-sm text-muted-foreground">{course.description}</p>
            </div>
          </div>
          <Badge variant="secondary">{LEVEL_LABELS[course.level] ?? course.level}</Badge>
        </div>

        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {course.completedLessons}/{course.totalLessons} lessons complete
            </span>
            <span className="font-medium">{course.progressPercent}%</span>
          </div>
          <Progress value={course.progressPercent} />
        </div>

        {!course.enrolled && (
          <Button
            type="button"
            className="mt-4"
            disabled={enroll.isPending}
            onClick={() => enroll.mutate()}
          >
            {enroll.isPending ? 'Enrolling…' : 'Enroll in this course'}
          </Button>
        )}
      </header>

      <div className="space-y-6">
        {course.modules.map((mod) => (
          <section key={mod.id} className="space-y-2">
            <div>
              <h2 className="text-lg font-semibold">{mod.title}</h2>
              <p className="text-sm text-muted-foreground">{mod.description}</p>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
              {mod.lessons.map((lesson) => {
                const open = openLessonId === lesson.id;
                return (
                  <div key={lesson.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenLessonId(open ? null : lesson.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                        open && 'bg-accent/50',
                      )}
                      aria-expanded={open}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{lesson.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {lesson.estimatedMinutes} min · {lesson.exercises.length} exercises
                        </span>
                      </span>
                    </button>
                    {open && (
                      <LessonView lesson={lesson} slug={course.slug} enrolled={course.enrolled} />
                    )}
                  </div>
                );
              })}
              {mod.lessons.length === 0 && (
                <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" /> Lessons coming soon.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
