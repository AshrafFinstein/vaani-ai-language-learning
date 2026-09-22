import { NavLink } from 'react-router-dom';
import { NAV_GROUPS } from '@/config/nav';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  onNavigate?: () => void;
}

/** The grouped navigation list, shared by the desktop sidebar and mobile drawer. */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
