import { useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { CHAT_TOPICS, LearningLevel, type ChatTopic } from '@vaani/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper int.',
  ADVANCED: 'Advanced',
};

interface StartScreenProps {
  onStart: (topic: ChatTopic, level: (typeof LearningLevel.options)[number]) => void;
  isPending?: boolean;
}

/** Topic + level picker shown when no conversation is active. */
export function StartScreen({ onStart, isPending }: StartScreenProps) {
  const user = useAuthStore((s) => s.user);
  const [level, setLevel] = useState<(typeof LearningLevel.options)[number]>(
    user?.level ?? 'BEGINNER',
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-10 text-center animate-fade-in">
      <span className="vaani-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white">
        <MessagesSquare className="h-7 w-7" />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Start an AI chat</h1>
        <p className="text-muted-foreground">
          Pick your level and a topic — Vaani will keep the conversation going.
        </p>
      </div>

      {/* Level segmented control */}
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

      {/* Topic grid */}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {CHAT_TOPICS.map((topic) => (
          <button
            key={topic.value}
            type="button"
            disabled={isPending}
            onClick={() => onStart(topic.value, level)}
            className="group flex flex-col items-start rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
          >
            <span className="font-medium">{topic.label}</span>
            <span className="text-sm text-muted-foreground">{topic.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
