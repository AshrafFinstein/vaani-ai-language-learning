import { DeckList } from '@/features/flashcards/DeckList';
import { GenerateDeckForm } from '@/features/flashcards/GenerateDeckForm';
import { useFlashcardDecks } from '@/features/flashcards/useFlashcards';

export default function FlashcardsPage() {
  const { data, isLoading } = useFlashcardDecks();

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
        <p className="text-muted-foreground">
          Build and review vocabulary decks with spaced repetition.
        </p>
      </header>

      <GenerateDeckForm />

      <DeckList decks={data?.decks ?? []} isLoading={isLoading} />
    </div>
  );
}
