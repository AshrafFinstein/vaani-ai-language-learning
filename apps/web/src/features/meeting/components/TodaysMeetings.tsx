import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarSearch, RefreshCw } from 'lucide-react';
import type { MeetingSummaryListDTO } from '@vaani/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMeetings, useCalendarSync, useSchedulerTick } from '../useMeetings';
import { MeetingStatusBadge } from './MeetingStatusBadge';

/** True when the given ISO timestamp falls on the same calendar day as `now`. */
function isToday(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Human countdown to the meeting start, e.g. "starts in 8 min" / "in progress". */
export function countdownLabel(startIso: string, endIso: string, now: Date): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const t = now.getTime();
  if (t >= end) return 'ended';
  if (t >= start) return 'in progress';
  const mins = Math.round((start - t) / 60_000);
  if (mins <= 0) return 'starting now';
  if (mins < 60) return `starts in ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `starts in ${hours} h` : `starts in ${hours} h ${rem} min`;
}

/** Re-renders every `intervalMs` so countdowns stay live. */
function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function TodaysMeetings() {
  const { data: meetings, isLoading } = useMeetings();
  const sync = useCalendarSync();
  const tick = useSchedulerTick();
  const now = useNow();

  const todays = (meetings ?? [])
    .filter((m) => isToday(m.scheduledStart, now))
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
        >
          <CalendarSearch className="h-4 w-4" /> {sync.isPending ? 'Syncing…' : 'Sync calendar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => tick.mutate()}
          disabled={tick.isPending}
        >
          <RefreshCw className="h-4 w-4" /> Refresh status
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading meetings…
          </CardContent>
        </Card>
      ) : todays.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">No meetings today.</p>
            <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
              Sync your calendar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {todays.map((m) => (
            <MeetingRow key={m.id} meeting={m} now={now} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MeetingRow({ meeting, now }: { meeting: MeetingSummaryListDTO; now: Date }) {
  return (
    <li>
      <Link to={`/app/meetings/${meeting.id}`} className="block">
        <Card className="transition-colors hover:border-primary/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{meeting.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(meeting.scheduledStart).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {countdownLabel(meeting.scheduledStart, meeting.scheduledEnd, now)}
              </p>
            </div>
            <MeetingStatusBadge status={meeting.status} />
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
