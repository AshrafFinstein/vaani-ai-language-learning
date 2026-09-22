import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import type { CourseSummaryDTO } from '@vaani/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper int.',
  ADVANCED: 'Advanced',
};

interface CourseCatalogProps {
  courses: CourseSummaryDTO[];
  isLoading?: boolean;
}

/** Grid of course cards linking to each course's detail page (Phase 9 catalog). */
export function CourseCatalog({ courses, isLoading }: CourseCatalogProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No courses are available yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link
          key={course.id}
          to={`/app/courses/${course.slug}`}
          className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open course ${course.title}`}
        >
          <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden="true">
                  {course.coverEmoji}
                </span>
                <Badge variant="secondary">{LEVEL_LABELS[course.level] ?? course.level}</Badge>
              </div>
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <CardDescription>{course.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {course.moduleCount} modules · {course.lessonCount} lessons ·{' '}
                {course.estimatedMinutes} min
              </p>
              {course.enrolled && (
                <div className="space-y-1">
                  <Progress value={course.progressPercent} />
                  <p className="text-xs text-muted-foreground">
                    {course.progressPercent}% complete
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
