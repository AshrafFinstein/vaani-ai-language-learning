import { Link } from 'react-router-dom';
import { HelpCircle, Settings } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { SidebarNav } from './SidebarNav';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initials } from '@/lib/format';

/** Fixed desktop sidebar (hidden below lg — mobile uses a drawer + bottom nav). */
export function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link to="/app/dashboard" aria-label="Vaani AI home">
          <Logo />
        </Link>
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <Separator />
      <div className="px-3 py-3">
        <Link
          to="/app/help"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          Help
        </Link>
        <Link
          to="/app/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </Link>
        <Separator className="my-2" />
        <Link
          to="/app/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/60"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user?.name ?? 'V')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name ?? 'Learner'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
