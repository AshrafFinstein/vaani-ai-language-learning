import type { AIFeedback } from '@vaani/types';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedbackPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback?: AIFeedback;
  isLoading?: boolean;
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

/** Slide-over panel showing structured tutor feedback for the conversation. */
export function FeedbackPanel({ open, onOpenChange, feedback, isLoading }: FeedbackPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetTitle>Conversation feedback</SheetTitle>
        <SheetDescription>Grammar, vocabulary, and fluency insights from Vaani.</SheetDescription>

        {isLoading && (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!isLoading && feedback && (
          <div className="mt-6 space-y-6">
            <p className="text-sm">{feedback.reply}</p>

            <div className="space-y-3">
              <Score label="Grammar" value={feedback.grammar_score} />
              <Score label="Fluency" value={feedback.fluency_score} />
              <Score label="Overall" value={feedback.overall_score} />
            </div>

            {feedback.corrections.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Corrections</h3>
                {feedback.corrections.map((c, i) => (
                  <div key={i} className="rounded-lg border p-3 text-sm">
                    <p className="text-muted-foreground line-through">{c.original}</p>
                    <p className="font-medium text-success">{c.corrected}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{c.explanation}</p>
                  </div>
                ))}
              </section>
            )}

            {feedback.vocabulary.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Vocabulary to try</h3>
                {feedback.vocabulary.map((v, i) => (
                  <div key={i} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{v.term}</p>
                    <p className="text-muted-foreground">{v.meaning}</p>
                    {v.example && <p className="mt-1 text-xs italic text-muted-foreground">“{v.example}”</p>}
                  </div>
                ))}
              </section>
            )}

            {feedback.pronunciation.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Pronunciation</h3>
                {feedback.pronunciation.map((p, i) => (
                  <div key={i} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{p.word}</p>
                    <p className="text-xs text-muted-foreground">{p.tip}</p>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
