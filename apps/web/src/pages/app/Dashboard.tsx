import { Link } from 'react-router-dom';
import { ArrowRight, Flame, GraduationCap, Star, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { WeeklyChart } from '@/features/dashboard/WeeklyChart';
import { useAuthStore } from '@/stores/authStore';
import { useLanguages } from '@/features/language/useLanguages';
import { greeting } from '@/lib/format';
import { mockDashboard as d } from '@/mock/dashboard';

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
  const language = languages?.find((l) => l.code === user?.learningLanguageCode);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  // Daily-goal target is a real user setting; minutes-today stays mock until Phase 8.
  const dailyGoalMinutes = user?.dailyGoalMinutes ?? d.dailyGoalMinutes;
  const goalPct = Math.min(100, Math.round((d.minutesToday / dailyGoalMinutes) * 100));

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
        <StatCard icon={GraduationCap} label="Current level" value={d.level} />
        <StatCard icon={Flame} label="Day streak" value={`${d.streakDays} days`} hint="Keep it going!" />
        <StatCard icon={Star} label="Total XP" value={d.xp.toLocaleString()} hint={`${d.xpToNext - d.xp} to next level`} />
        <StatCard icon={TrendingUp} label="This week" value={`${d.weeklyMinutes} min`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Continue learning */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Continue learning</CardTitle>
            <Badge variant="secondary">{d.continueLearning.skill}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">{d.continueLearning.title}</p>
              <p className="text-sm text-muted-foreground">
                You&apos;re {d.continueLearning.progress}% through this session.
              </p>
            </div>
            <Progress value={d.continueLearning.progress} />
            <Button asChild variant="gradient">
              <Link to={d.continueLearning.to}>
                Continue <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
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
              <span className="text-3xl font-bold tabular-nums">{d.minutesToday}</span>
              <span className="text-sm text-muted-foreground">/ {dailyGoalMinutes} min</span>
            </div>
            <Progress value={goalPct} />
            <p className="text-sm text-muted-foreground">
              {goalPct >= 100
                ? 'Goal complete — amazing! 🎉'
                : `${dailyGoalMinutes - d.minutesToday} minutes left today.`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick practice */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick practice</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {d.quickActions.map((action) => (
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
          <CardHeader>
            <CardTitle>Weekly activity</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyChart data={d.weekly} />
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {d.skills.map((skill) => (
              <div key={skill.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{skill.label}</span>
                  <span className="font-medium tabular-nums">{skill.score}</span>
                </div>
                <Progress value={skill.score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Stats shown are sample data for the dashboard preview — live progress arrives in a later
        phase.
      </p>
    </div>
  );
}
