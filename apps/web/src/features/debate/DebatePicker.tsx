import { useState } from 'react';
import { Scale } from 'lucide-react';
import { DEBATE_TOPICS, LearningLevel, type DebateSide } from '@vaani/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper int.',
  ADVANCED: 'Advanced',
};

interface DebatePickerProps {
  isPending?: boolean;
  onStart: (
    topicKey: string,
    side: DebateSide,
    level: (typeof LearningLevel.options)[number],
  ) => void;
}

/** Topic + side + level selector to open a debate. The AI argues the opposing side. */
export function DebatePicker({ isPending, onStart }: DebatePickerProps) {
  const user = useAuthStore((s) => s.user);
  const [level, setLevel] = useState<(typeof LearningLevel.options)[number]>(
    user?.level ?? 'INTERMEDIATE',
  );
  const [side, setSide] = useState<DebateSide>('FOR');
  const [topicKey, setTopicKey] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-10 text-center animate-fade-in">
      <span className="vaani-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white">
        <Scale className="h-7 w-7" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Debate</h1>
        <p className="text-muted-foreground">
          Pick a motion and a side. The AI argues the other side, then scores your case.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {LearningLevel.options.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setLevel(value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              level === value
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            )}
          >
            {LEVEL_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="inline-flex rounded-full border p-1" role="group" aria-label="Choose your side">
        {(['FOR', 'AGAINST'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            aria-pressed={side === s}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              side === s ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            {s === 'FOR' ? 'Argue for' : 'Argue against'}
          </button>
        ))}
      </div>

      <div className="grid w-full grid-cols-1 gap-3">
        {DEBATE_TOPICS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTopicKey(t.key)}
            aria-pressed={topicKey === t.key}
            className={cn(
              'flex flex-col items-start gap-1 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
              topicKey === t.key && 'ring-2 ring-primary',
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-medium">{t.motion}</span>
              <Badge variant="muted">{t.category}</Badge>
            </div>
            <span className="text-sm text-muted-foreground">{t.description}</span>
          </button>
        ))}
      </div>

      <Button
        variant="gradient"
        size="lg"
        disabled={!topicKey || isPending}
        onClick={() => topicKey && onStart(topicKey, side, level)}
      >
        Start debate
      </Button>
    </div>
  );
}
