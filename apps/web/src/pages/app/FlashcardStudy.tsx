import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { StudySession } from '@/features/flashcards/StudySession';
import { useFlashcardReviewQueue } from '@/features/flashcards/useFlashcards';
import { Skeleton } from '@/components/ui/skeleton';

export default function FlashcardStudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const { data, isLoading } = useFlashcardReviewQueue(deckId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <Link
        to="/app/flashcards"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to decks
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Study</h1>
        <p className="text-muted-foreground">
          Flip each card, then rate how well you knew it to schedule the next review.
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <StudySession cards={data?.queue.cards ?? []} />
      )}
    </div>
  );
}
