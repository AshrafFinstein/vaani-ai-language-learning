import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import type { FlashcardDeckSummaryDTO } from '@vaani/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface DeckListProps {
  decks: FlashcardDeckSummaryDTO[];
  isLoading?: boolean;
}

/** Grid of flashcard deck cards, each linking to its study/review page. */
export function DeckList({ decks, isLoading }: DeckListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Layers className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">
          No decks yet. Generate one from a topic to start building your vocabulary!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck) => (
        <Link
          key={deck.id}
          to={`/app/flashcards/${deck.id}`}
          className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Study deck ${deck.title}`}
        >
          <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden="true">
                  🃏
                </span>
                <Badge variant={deck.isSystem ? 'secondary' : 'default'}>
                  {deck.isSystem ? 'Shared' : 'Yours'}
                </Badge>
              </div>
              <CardTitle className="text-lg">{deck.title}</CardTitle>
              <CardDescription>{deck.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {deck.cardCount} cards
                {deck.dueCount > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-primary">{deck.dueCount} due</span>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
