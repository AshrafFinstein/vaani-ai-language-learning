import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Split layout for public auth pages: brand panel + form. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <div className="vaani-gradient relative hidden flex-col justify-between p-10 text-white lg:flex">
        <Link to="/">
          <Logo className="[&_span]:text-white [&_.vaani-text-gradient]:text-white/90" />
        </Link>
        <div className="max-w-md space-y-4">
          <Sparkles className="h-8 w-8" />
          <h2 className="text-3xl font-bold leading-tight">
            Speak a new language with confidence.
          </h2>
          <p className="text-white/80">
            Practice real conversations, get instant feedback, and build a daily habit with your
            personal AI tutor.
          </p>
        </div>
        <p className="text-sm text-white/70">© {new Date().getFullYear()} Vaani AI</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
