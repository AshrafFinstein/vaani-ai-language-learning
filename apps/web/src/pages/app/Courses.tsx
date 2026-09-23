import { CourseCatalog } from '@/features/courses/CourseCatalog';
import { LearningPathPanel } from '@/features/courses/LearningPathPanel';
import { useCourseCatalog } from '@/features/courses/useCourses';

export default function CoursesPage() {
  const { data, isLoading } = useCourseCatalog();

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
        <p className="text-muted-foreground">
          Structured lessons and exercises to build your skills step by step.
        </p>
      </header>

      <LearningPathPanel />

      <CourseCatalog courses={data?.courses ?? []} isLoading={isLoading} />
    </div>
  );
}
