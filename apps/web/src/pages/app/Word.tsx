import { useEffect, useMemo, useState } from 'react';
import { BookA, Check, RotateCcw, Volume2 } from 'lucide-react';
import { getWordDeck, type WordCard } from '@vaani/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';

function loadKnown(lang: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`vaani-words-known-${lang}`) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function saveKnown(lang: string, ids: string[]) {
  localStorage.setItem(`vaani-words-known-${lang}`, JSON.stringify(ids));
}

/** Speaks a word using the browser's speech synthesis, if available. */
function speak(text: string, lang: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function WordPage() {
  const user = useAuthStore((s) => s.user);
  const lang = user?.learningLanguageCode ?? 'en';
  const deck = useMemo(() => getWordDeck(lang), [lang]);

  const [known, setKnown] = useState<string[]>(() => loadKnown(lang));
  const [queue, setQueue] = useState<WordCard[]>([]);
  const [revealed, setRevealed] = useState(false);

  // (Re)initialize the review queue when the language (deck) changes.
  useEffect(() => {
    const knownIds = loadKnown(lang);
    setKnown(knownIds);
    setQueue(deck.filter((c) => !knownIds.includes(c.id)));
    setRevealed(false);
  }, [lang, deck]);

  const current = queue[0];

  function markKnown() {
    if (!current) return;
    const next = [...known, current.id];
    setKnown(next);
    saveKnown(lang, next);
    setQueue((q) => q.slice(1));
    setRevealed(false);
  }
  function needPractice() {
    setQueue((q) => (q.length ? [...q.slice(1), q[0]!] : q));
    setRevealed(false);
  }
  function resetProgress() {
    saveKnown(lang, []);
    setKnown([]);
    setQueue(deck);
    setRevealed(false);
  }

  const progress = deck.length ? Math.round((known.length / deck.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="vaani-gradient flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <BookA className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Word practice</h1>
          <p className="text-sm text-muted-foreground">
            {known.length} / {deck.length} words learned
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetProgress}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      <Progress value={progress} />

      {current ? (
        <Card>
          <CardContent className="space-y-5 p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold">{current.word}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Pronounce word"
                onClick={() => speak(current.word, lang)}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>
            {current.pronunciation && (
              <p className="text-sm text-muted-foreground">/{current.pronunciation}/</p>
            )}

            {revealed ? (
              <div className="space-y-3 text-left animate-fade-in">
                <p>{current.meaning}</p>
                <p className="rounded-lg bg-muted p-3 text-sm italic">“{current.example}”</p>
                {current.translation && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Translation: </span>
                    {current.translation}
                  </p>
                )}
                {current.synonyms?.length ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">Synonyms:</span>
                    {current.synonyms.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={needPractice}>
                    Need practice
                  </Button>
                  <Button variant="gradient" className="flex-1" onClick={markKnown}>
                    <Check className="h-4 w-4" /> I know this
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="gradient" className="w-full" onClick={() => setRevealed(true)}>
                Show meaning
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="vaani-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white">
              <Check className="h-6 w-6" />
            </span>
            <p className="font-semibold">All caught up!</p>
            <p className="text-sm text-muted-foreground">
              You&apos;ve reviewed every word in this deck. Reset to practice again.
            </p>
            <Button variant="outline" onClick={resetProgress}>
              <RotateCcw className="h-4 w-4" /> Restart deck
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
