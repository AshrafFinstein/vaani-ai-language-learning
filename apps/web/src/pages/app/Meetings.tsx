import { Link } from 'react-router-dom';
import { CalendarClock, Plus, Users, ListChecks } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMeetings } from '@/features/meeting/useMeetings';
import { MEETING_PROVIDERS } from '@vaani/types';

function providerLabel(value: string): string {
  return MEETING_PROVIDERS.find((p) => p.value === value)?.label ?? value;
}

export default function MeetingsPage() {
  const { data: meetings, isLoading } = useMeetings();

  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="vaani-gradient flex h-11 w-11 items-center justify-center rounded-xl text-white">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
            <p className="text-sm text-muted-foreground">
              Schedule meetings and review AI summaries, decisions, and action items.
            </p>
          </div>
        </div>
        <Button asChild variant="gradient">
          <Link to="/app/meetings/schedule">
            <Plus className="h-4 w-4" /> Schedule
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading meetings…
          </CardContent>
        </Card>
      ) : !meetings || meetings.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">No meetings scheduled yet.</p>
            <Button asChild variant="outline">
              <Link to="/app/meetings/schedule">Schedule your first meeting</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <Link key={m.id} to={`/app/meetings/${m.id}`} className="block">
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.scheduledStart).toLocaleString()} · {providerLabel(m.provider)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" /> {m.participantCount}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <ListChecks className="h-3 w-3" /> {m.actionItemCount}
                    </Badge>
                    {m.recordingState === 'RECORDING' && (
                      <Badge variant="destructive" className="gap-1.5">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden />
                        Recording
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
