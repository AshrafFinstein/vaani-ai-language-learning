import { NavLink } from 'react-router-dom';
import { MOBILE_NAV } from '@/config/nav';
import { cn } from '@/lib/utils';

/** Bottom navigation bar shown on mobile only (hidden at lg+). */
export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t bg-card lg:hidden">
      {MOBILE_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
