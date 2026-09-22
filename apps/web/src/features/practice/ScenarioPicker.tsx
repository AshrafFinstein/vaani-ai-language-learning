import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { LearningLevel } from '@vaani/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper int.',
  ADVANCED: 'Advanced',
};

export interface ScenarioItem {
  key: string;
  title: string;
  description: string;
  badge?: string;
}

interface ScenarioPickerProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  items: ScenarioItem[];
  isPending?: boolean;
  onSelect: (key: string, level: (typeof LearningLevel.options)[number]) => void;
}

/** Level selector + scenario cards, shared by Roleplay and Dialogue start screens. */
export function ScenarioPicker({
  icon: Icon,
  title,
  subtitle,
  items,
  isPending,
  onSelect,
}: ScenarioPickerProps) {
  const user = useAuthStore((s) => s.user);
  const [level, setLevel] = useState<(typeof LearningLevel.options)[number]>(
    user?.level ?? 'BEGINNER',
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-10 text-center animate-fade-in">
      <span className="vaani-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white">
        <Icon className="h-7 w-7" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
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

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={isPending}
            onClick={() => onSelect(item.key, level)}
            className="group flex flex-col items-start gap-1 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-medium">{item.title}</span>
              {item.badge && <Badge variant="muted">{item.badge}</Badge>}
            </div>
            <span className="text-sm text-muted-foreground">{item.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
