import { Link } from 'react-router-dom';
import { LogOut, Settings, User as UserIcon, Monitor, Moon, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '@/features/auth/useAuth';
import { useTheme } from '@/components/theme/theme-provider';
import { initials } from '@/lib/format';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="h-9 w-9">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
          <AvatarFallback>{initials(user?.name ?? 'V')}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate font-medium">{user?.name ?? 'Learner'}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user?.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/profile">
            <UserIcon /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('light')} data-active={theme === 'light'}>
          <Sun /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} data-active={theme === 'dark'}>
          <Moon /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} data-active={theme === 'system'}>
          <Monitor /> System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => logout.mutate()}
        >
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
