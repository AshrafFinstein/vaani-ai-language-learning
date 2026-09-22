import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Flame,
  GraduationCap,
  Lightbulb,
  MessagesSquare,
  Sparkles,
  Star,
  Trophy,
  Clock,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WeeklyChart } from '@/features/dashboard/WeeklyChart';
import {
  useAchievements,
  useDailyFeedback,
  useProgress,
} from '@/features/progress/useProgress';

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold tabular-nums">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const SESSION_ROWS: Array<{ key: string; label: string }> = [
  { key: 'chat', label: 'AI Chats' },
  { key: 'roleplay', label: 'Roleplays' },
  { key: 'call', label: 'Calls' },
  { key: 'dialogue', label: 'Dialogues' },
  { key: 'sentence', label: 'Sentences' },
  { key: 'word', label: 'Words' },
  { key: 'flashcard', label: 'Flashcards' },
  { key: 'course', label: 'Course lessons' },
  { key: 'debate', label: 'Debates' },
  { key: 'photo', label: 'Photo chats' },
  { key: 'character', label: 'Characters' },
  { key: 'meeting', label: 'Meetings' },
];

export default function ProgressPage() {
  const { data: progress, isLoading } = useProgress();
  const { data: feedback } = useDailyFeedback();
  const { data: achievements } = useAchievements();

  const hasActivity = (progress?.totalSessions ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
        <Skeleton className="h-[260px]" />
      </div>
    );
  }

  const counts = progress?.sessionCounts;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">
          Your learning stats, streaks, and achievements at a glance.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={GraduationCap}
          label="Current level"
          value={progress?.levelLabel ?? '—'}
          hint={`Level ${progress?.level ?? 1}`}
        />
        <StatTile
          icon={Flame}
          label="Current streak"
          value={`${progress?.currentStreak ?? 0} days`}
          hint={`Best: ${progress?.longestStreak ?? 0} days`}
        />
        <StatTile
          icon={Star}
          label="Total XP"
          value={(progress?.xp ?? 0).toLocaleString()}
          hint={
            progress && progress.xpToNextLevel > 0
              ? `${progress.xpToNextLevel.toLocaleString()} to next level`
              : 'Max level'
          }
        />
        <StatTile
          icon={Clock}
          label="Total practice"
          value={`${progress?.totalMinutes ?? 0} min`}
          hint={`${progress?.weeklyMinutes ?? 0} min this week`}
        />
      </div>

      {/* Daily feedback */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Daily feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback ? (
            <>
              <p className="text-sm">{feedback.summary}</p>
              {feedback.highlights.length > 0 && (
                <div className="space-y-1.5">
                  {feedback.highlights.map((h) => (
                    <div key={h} className="flex items-start gap-2 text-sm">
                      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              )}
              {feedback.suggestions.length > 0 && (
                <div className="space-y-1.5">
                  {feedback.suggestions.map((s) => (
                    <div key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Skeleton className="h-16" />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly activity</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyChart data={progress?.weekly ?? []} />
          </CardContent>
        </Card>

        {/* Level / XP */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Star className="h-5 w-5 text-primary" />
            <CardTitle>Level {progress?.level ?? 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{progress?.levelLabel}</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold tabular-nums">
                {(progress?.xp ?? 0).toLocaleString()} XP
              </span>
            </div>
            {progress && progress.xpToNextLevel > 0 && (
              <p className="text-sm text-muted-foreground">
                {progress.xpToNextLevel.toLocaleString()} XP to the next level.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sessions by type */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions by type</CardTitle>
          </CardHeader>
          <CardContent>
            {hasActivity && counts ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {SESSION_ROWS.map((row) => (
                  <div key={row.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium tabular-nums">
                      {counts[row.key as keyof typeof counts]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sessions yet. Start practicing to see a breakdown here.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Highlights: meetings, courses, flashcards */}
        <Card>
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessagesSquare className="h-4 w-4" /> Conversations
              </span>
              <span className="font-medium tabular-nums">{progress?.conversationCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="h-4 w-4" /> Flashcards reviewed
              </span>
              <span className="font-medium tabular-nums">{progress?.flashcardsReviewed ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4" /> Meeting action items
              </span>
              <span className="font-medium tabular-nums">{progress?.actionItemCount ?? 0}</span>
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course completion</span>
                <span className="font-medium tabular-nums">
                  {progress?.courseCompletionPercent ?? 0}%
                </span>
              </div>
              <ProgressBar value={progress?.courseCompletionPercent ?? 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> Achievements
          </CardTitle>
          {achievements && (
            <Badge variant="secondary">
              {achievements.earned.length}/
              {achievements.earned.length + achievements.available.length}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {achievements ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...achievements.earned, ...achievements.available].map((a) => (
                <div
                  key={a.code}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    a.unlocked ? 'bg-card' : 'bg-muted/40 opacity-70'
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {a.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    {a.unlocked && (
                      <span className="mt-1 inline-block text-xs font-medium text-primary">
                        Unlocked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton className="h-24" />
          )}
        </CardContent>
      </Card>

      {!hasActivity && (
        <div className="flex justify-center">
          <Button asChild variant="gradient">
            <Link to="/app/chat">
              Start practicing <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
