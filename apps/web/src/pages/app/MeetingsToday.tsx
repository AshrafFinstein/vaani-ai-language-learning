import { CalendarCheck } from 'lucide-react';
import { TodaysMeetings } from '@/features/meeting/components/TodaysMeetings';

export default function MeetingsTodayPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="vaani-gradient flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <CalendarCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today&apos;s Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Live countdown and lifecycle status. Capture is consent-gated and never covert.
          </p>
        </div>
      </div>
      <TodaysMeetings />
    </div>
  );
}
