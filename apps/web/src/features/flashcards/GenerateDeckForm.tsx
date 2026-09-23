import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { useGenerateFlashcardDeck } from './useFlashcards';

/** Small form that generates a flashcard deck for a topic via the `@vaani/ai` abstraction. */
export function GenerateDeckForm() {
  const [topic, setTopic] = useState('');
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const generate = useGenerateFlashcardDeck();

  function onGenerate() {
    const trimmed = topic.trim();
    if (!trimmed) return;
    generate.mutate(
      { topic: trimmed, languageCode: user?.learningLanguageCode ?? undefined, level: user?.level ?? undefined },
      { onSuccess: (data) => navigate(`/app/flashcards/${data.deck.id}`) },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Generate a deck
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic, e.g. 'ordering food'"
            aria-label="Deck topic"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onGenerate();
            }}
          />
          <Button type="button" disabled={generate.isPending || !topic.trim()} onClick={onGenerate}>
            {generate.isPending ? 'Generating…' : 'Generate'}
          </Button>
        </div>
        {generate.isError && (
          <p className="mt-2 text-sm text-destructive">Could not generate a deck. Please try again.</p>
        )}
      </CardContent>
    </Card>
  );
}
