import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from './useNotifications';

/**
 * The notifications surface (bell + dropdown list). In-app only — push/desktop
 * delivery is deferred. Consumes the notification API; the badge shows unread count.
 */
export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
              aria-label={`${unread} unread notifications`}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const inner = (
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.body}</span>
                </div>
              );
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => !n.readAt && markRead.mutate(n.id)}
                    className={cn(
                      'block w-full px-3 py-2 text-left hover:bg-accent/60',
                      !n.readAt && 'bg-accent/30',
                    )}
                  >
                    {n.meetingId ? (
                      <Link to={`/app/meetings/${n.meetingId}`}>{inner}</Link>
                    ) : (
                      inner
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
