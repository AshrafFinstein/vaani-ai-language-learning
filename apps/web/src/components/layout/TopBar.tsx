import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Menu, Search } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNav } from './SidebarNav';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import { NotificationBell } from '@/features/notification/NotificationBell';
import { useProgress } from '@/features/progress/useProgress';

export function TopBar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data: progress } = useProgress();
  const streakDays = progress?.currentStreak ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-6">
      {/* Mobile drawer trigger */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 items-center px-5">
            <Logo />
          </div>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="overflow-y-auto">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Link to="/app/dashboard" className="lg:hidden" aria-label="Vaani AI home">
        <Logo showWordmark={false} />
      </Link>

      <LanguageSwitcher />

      {/* Search — grows to fill, collapses to an icon button on small screens */}
      <div className="ml-auto flex items-center gap-1.5 sm:ml-4 sm:mr-auto sm:max-w-md sm:flex-1">
        <div className="relative hidden w-full sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search lessons, words, topics…" className="pl-9" />
        </div>
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="gap-1 py-1">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          <span className="tabular-nums">{streakDays}</span>
        </Badge>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
