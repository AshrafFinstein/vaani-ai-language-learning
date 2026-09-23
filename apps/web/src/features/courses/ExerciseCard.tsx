import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { ExerciseDTO, ExerciseResult } from '@vaani/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useSubmitExercise } from './useCourses';

interface ExerciseCardProps {
  exercise: ExerciseDTO;
  index: number;
}

/** A single course exercise the learner answers and submits for grading. */
export function ExerciseCard({ exercise, index }: ExerciseCardProps) {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const submit = useSubmitExercise();

  const isChoice = exercise.kind === 'MULTIPLE_CHOICE' && exercise.options.length > 0;

  function onSubmit(value: string) {
    if (!value.trim()) return;
    submit.mutate(
      { exerciseId: exercise.id, answer: value },
      { onSuccess: (data) => setResult(data.result) },
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="mb-3 font-medium">
        {index + 1}. {exercise.prompt}
      </p>

      {isChoice ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {exercise.options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={submit.isPending || result !== null}
              onClick={() => {
                setAnswer(option);
                onSubmit(option);
              }}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-70',
                answer === option && 'border-primary bg-primary/5',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {exercise.kind === 'FREE_RESPONSE' ? (
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              rows={3}
              disabled={result !== null}
            />
          ) : (
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              disabled={result !== null}
            />
          )}
          <Button
            type="button"
            size="sm"
            disabled={submit.isPending || result !== null || !answer.trim()}
            onClick={() => onSubmit(answer)}
          >
            {submit.isPending ? 'Checking…' : 'Check answer'}
          </Button>
        </div>
      )}

      {result && (
        <div
          className={cn(
            'mt-3 flex items-start gap-2 rounded-md p-3 text-sm',
            result.isCorrect
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
          )}
          role="status"
        >
          {result.isCorrect ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <X className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            <span className="font-medium">
              {result.isCorrect ? 'Correct!' : 'Not quite.'}
            </span>{' '}
            {result.feedback}
            {!result.isCorrect && (
              <span className="mt-1 block text-muted-foreground">
                Expected: {result.correctAnswer}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
