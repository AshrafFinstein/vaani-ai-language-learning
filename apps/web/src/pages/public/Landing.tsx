import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MessagesSquare,
  Mic,
  Drama,
  BarChart3,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const FEATURES = [
  { icon: MessagesSquare, title: 'AI Chat Tutor', desc: 'Natural conversations that adapt to your level, with feedback when you want it.' },
  { icon: Drama, title: 'Roleplay Scenarios', desc: 'Rehearse real situations — interviews, travel, dining — before they happen.' },
  { icon: Mic, title: 'Voice & Pronunciation', desc: 'Speak out loud and get pronunciation guidance in real time.' },
  { icon: GraduationCap, title: 'Structured Courses', desc: 'Guided lessons and exercises that build skills step by step.' },
  { icon: Sparkles, title: 'Smart Feedback', desc: 'Grammar, vocabulary and fluency scoring after every session.' },
  { icon: BarChart3, title: 'Progress Tracking', desc: 'Streaks, XP and skill charts keep your daily habit on track.' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/features" className="hover:text-foreground">Features</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/about" className="hover:text-foreground">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-16 text-center lg:px-8 lg:py-28">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-accent/50 px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Your personal AI language tutor
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Learn to <span className="vaani-text-gradient">speak</span>, not just study.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Vaani AI helps you practice real conversations across 11 languages — speaking,
            listening, grammar and vocabulary — with instant, personalized feedback.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="gradient" size="lg">
              <Link to="/register">
                Start learning free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="vaani-gradient mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 lg:px-8">
          <div className="vaani-gradient overflow-hidden rounded-3xl px-8 py-14 text-center text-white">
            <h2 className="text-3xl font-bold">Ready to build your streak?</h2>
            <p className="mx-auto mt-2 max-w-md text-white/80">
              Join Vaani AI and turn a few minutes a day into real fluency.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link to="/register">Create your free account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row lg:px-8">
          <Logo />
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <span>© {new Date().getFullYear()} Vaani AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
