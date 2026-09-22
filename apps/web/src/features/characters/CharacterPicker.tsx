import { useState } from 'react';
import { Users } from 'lucide-react';
import { LearningLevel, type CharacterDTO } from '@vaani/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper int.',
  ADVANCED: 'Advanced',
};

interface CharacterPickerProps {
  characters: CharacterDTO[];
  isLoading?: boolean;
  isPending?: boolean;
  onSelect: (characterKey: string, level: (typeof LearningLevel.options)[number]) => void;
}

/** Level selector + character persona cards for Character conversations. */
export function CharacterPicker({
  characters,
  isLoading,
  isPending,
  onSelect,
}: CharacterPickerProps) {
  const user = useAuthStore((s) => s.user);
  const [level, setLevel] = useState<(typeof LearningLevel.options)[number]>(
    user?.level ?? 'BEGINNER',
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-10 text-center animate-fade-in">
      <span className="vaani-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white">
        <Users className="h-7 w-7" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Characters</h1>
        <p className="text-muted-foreground">
          Pick a persona and practice a natural conversation with them.
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

      {isLoading ? (
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {characters.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={isPending}
              onClick={() => onSelect(c.key, level)}
              className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
            >
              <span className="text-3xl" aria-hidden="true">
                {c.avatarEmoji}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{c.name}</span>
                <span className="block text-sm text-muted-foreground">{c.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
