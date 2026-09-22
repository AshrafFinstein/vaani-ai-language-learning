import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { FlashcardResult, FlashcardReviewCardDTO } from '@vaani/types';
import { Button } from '@/components/ui/button';
import { useSubmitFlashcardReview } from './useFlashcards';

interface StudySessionProps {
  cards: FlashcardReviewCardDTO[];
}

const GRADES: Array<{ result: FlashcardResult; label: string; className: string }> = [
  { result: 'AGAIN', label: 'Again', className: 'border-red-300 text-red-700 dark:text-red-300' },
  { result: 'GOOD', label: 'Good', className: 'border-blue-300 text-blue-700 dark:text-blue-300' },
  { result: 'EASY', label: 'Easy', className: 'border-emerald-300 text-emerald-700 dark:text-emerald-300' },
];

/**
 * Study/review flow: shows a card front (term), flips to reveal the back (translation +
 * example), then the learner grades it Again/Good/Easy. Grading submits the review (advancing
 * the spaced-repetition state) and advances to the next card.
 */
export function StudySession({ cards }: StudySessionProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const submit = useSubmitFlashcardReview();

  const total = cards.length;
  const current = cards[index];
  const progressLabel = useMemo(() => `Card ${Math.min(index + 1, total)} of ${total}`, [index, total]);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">Nothing to review right now — great job! Check back later.</p>
      </div>
    );
  }

  if (done || !current) {
    return (
      <div className="rounded-xl border py-16 text-center" role="status">
        <p className="text-lg font-semibold">Review complete! 🎉</p>
        <p className="mt-1 text-muted-foreground">You reviewed {total} cards in this session.</p>
      </div>
    );
  }

  function grade(result: FlashcardResult) {
    if (!current) return;
    submit.mutate({ flashcardId: current.id, result });
    const isLast = index + 1 >= total;
    if (isLast) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">{progressLabel}</p>

      <div className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold" data-testid="card-front">
          {current.term}
        </p>

        {flipped ? (
          <div className="mt-6 space-y-2 border-t pt-6" data-testid="card-back">
            <p className="text-xl">{current.translation}</p>
            {current.example && (
              <p className="text-sm italic text-muted-foreground">{current.example}</p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Tap “Show answer” to reveal the meaning.</p>
        )}
      </div>

      {!flipped ? (
        <Button type="button" onClick={() => setFlipped(true)} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Show answer
        </Button>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {GRADES.map((g) => (
            <Button
              key={g.result}
              type="button"
              variant="outline"
              disabled={submit.isPending}
              className={g.className}
              onClick={() => grade(g.result)}
            >
              {g.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
