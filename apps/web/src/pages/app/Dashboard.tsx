import { Link } from 'react-router-dom';
import { ArrowRight, Flame, GraduationCap, Star, Target, TrendingUp } from 'lucide-react';
import {
  MessagesSquare,
  Drama,
  Phone,
  BookOpen,
  SpellCheck,
  Mic,
  Image,
  Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { WeeklyChart } from '@/features/dashboard/WeeklyChart';
import { useAuthStore } from '@/stores/authStore';
import { useLanguages } from '@/features/language/useLanguages';
import { useProgress } from '@/features/progress/useProgress';
import { greeting } from '@/lib/format';

/** Quick-practice navigation shortcuts (static — these are links, not learner data). */
const QUICK_ACTIONS = [
  { label: 'AI Chat', to: '/app/chat', icon: MessagesSquare },
  { label: 'Roleplay', to: '/app/roleplay', icon: Drama },
  { label: 'Call', to: '/app/call', icon: Phone },
  { label: 'Vocabulary', to: '/app/flashcards', icon: BookOpen },
  { label: 'Grammar', to: '/app/grammar', icon: SpellCheck },
  { label: 'Pronunciation', to: '/app/pronunciation', icon: Mic },
  { label: 'Photo Practice', to: '/app/photo', icon: Image },
  { label: 'Debate', to: '/app/debate', icon: Scale },
];

function StatCard({
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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: languages } = useLanguages();
  const { data: progress, isLoading } = useProgress();
  const language = languages?.find((l) => l.code === user?.learningLanguageCode);
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const dailyGoalMinutes = progress?.dailyGoalMinutes ?? user?.dailyGoalMinutes ?? 30;
  const minutesToday = progress?.minutesToday ?? 0;
  const goalPct =
    dailyGoalMinutes > 0 ? Math.min(100, Math.round((minutesToday / dailyGoalMinutes) * 100)) : 0;
  const hasActivity = (progress?.totalSessions ?? 0) > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground">
          Ready to improve your {language?.name ?? 'language'}
          {language ? ` ${language.flagEmoji}` : ''}? Here&apos;s your progress.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (
          <>
            <StatCard icon={GraduationCap} label="Current level" value={progress?.levelLabel ?? '—'} />
            <StatCard
              icon={Flame}
              label="Day streak"
              value={`${progress?.currentStreak ?? 0} days`}
              hint={hasActivity ? 'Keep it going!' : 'Practice to start a streak'}
            />
            <StatCard
              icon={Star}
              label="Total XP"
              value={(progress?.xp ?? 0).toLocaleString()}
              hint={
                progress && progress.xpToNextLevel > 0
                  ? `${progress.xpToNextLevel.toLocaleString()} to next level`
                  : undefined
              }
            />
            <StatCard
              icon={TrendingUp}
              label="This week"
              value={`${progress?.weeklyMinutes ?? 0} min`}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Overall practice time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overall practice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-16" />
            ) : hasActivity ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums">{progress?.totalMinutes ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total minutes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{progress?.totalSessions ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {progress?.conversationCount ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Conversations</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {progress?.flashcardsReviewed ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Flashcards</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t practiced yet. Start a session below and your progress will show
                  up here.
                </p>
                <Button asChild variant="gradient">
                  <Link to="/app/chat">
                    Start practicing <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily goal */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Daily goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold tabular-nums">{minutesToday}</span>
              <span className="text-sm text-muted-foreground">/ {dailyGoalMinutes} min</span>
            </div>
            <Progress value={goalPct} />
            <p className="text-sm text-muted-foreground">
              {goalPct >= 100
                ? 'Goal complete — amazing! 🎉'
                : `${Math.max(0, dailyGoalMinutes - minutesToday)} minutes left today.`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick practice */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick practice</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="vaani-gradient flex h-10 w-10 items-center justify-center rounded-lg text-white">
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Weekly activity</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/progress">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <WeeklyChart data={progress?.weekly ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Course progress */}
        <Card>
          <CardHeader>
            <CardTitle>Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-16" />
            ) : (progress?.coursesEnrolled ?? 0) > 0 ? (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold tabular-nums">
                    {progress?.courseCompletionPercent ?? 0}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {progress?.coursesCompleted ?? 0}/{progress?.coursesEnrolled ?? 0} done
                  </span>
                </div>
                <Progress value={progress?.courseCompletionPercent ?? 0} />
                <Button asChild variant="outline" className="w-full">
                  <Link to="/app/courses">Continue courses</Link>
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enroll in a course to track structured progress.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/app/courses">Browse courses</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
