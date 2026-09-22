import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGenerateLearningPath } from './useCourses';

/** AI-generated learning path recommender (Phase 9), backed by the @vaani/ai abstraction. */
export function LearningPathPanel() {
  const [goal, setGoal] = useState('');
  const generate = useGenerateLearningPath();
  const path = generate.data?.path;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="vaani-gradient flex h-9 w-9 items-center justify-center rounded-lg text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">AI Learning Path</h2>
          <p className="text-sm text-muted-foreground">
            Get a personalized, ordered plan across our courses.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Your goal (optional), e.g. travel to Spain"
          aria-label="Learning goal"
        />
        <Button
          type="button"
          disabled={generate.isPending}
          onClick={() => generate.mutate({ goal: goal.trim() || undefined })}
        >
          {generate.isPending ? 'Generating…' : 'Generate path'}
        </Button>
      </div>

      {path && (
        <div className="mt-4 space-y-3">
          <p className="text-sm">{path.summary}</p>
          <ol className="space-y-2">
            {path.steps.map((step, i) => (
              <li key={step.courseSlug} className="rounded-lg border p-3">
                <Link
                  to={`/app/courses/${step.courseSlug}`}
                  className="font-medium hover:underline"
                >
                  {i + 1}. {step.title}
                </Link>
                <p className="text-sm text-muted-foreground">{step.reason}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
