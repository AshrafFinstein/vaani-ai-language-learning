import type { DebateFeedback } from '@vaani/types';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface DebateFeedbackPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback?: DebateFeedback;
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

/** Slide-over showing structured debate scoring (argument quality, persuasiveness). */
export function DebateFeedbackPanel({
  open,
  onOpenChange,
  feedback,
  isLoading,
}: DebateFeedbackPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetTitle>Debate feedback</SheetTitle>
        <SheetDescription>How persuasive and well-argued your case was.</SheetDescription>

        {isLoading && (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!isLoading && feedback && (
          <div className="mt-6 space-y-6">
            <p className="text-sm">{feedback.summary}</p>

            <div className="space-y-3">
              <Score label="Argument quality" value={feedback.argument_quality_score} />
              <Score label="Persuasiveness" value={feedback.persuasiveness_score} />
              <Score label="Overall" value={feedback.overall_score} />
            </div>

            {feedback.strengths.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Strengths</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {feedback.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}

            {feedback.improvements.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">To improve</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {feedback.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
