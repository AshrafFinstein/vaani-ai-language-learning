import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduleForm } from '@/features/meeting/components/ScheduleForm';
import { useScheduleMeeting } from '@/features/meeting/useMeetings';

export default function MeetingSchedulePage() {
  const navigate = useNavigate();
  const schedule = useScheduleMeeting();

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/meetings')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="vaani-gradient flex h-11 w-11 items-center justify-center rounded-xl text-white">
          <CalendarPlus className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule a meeting</h1>
          <p className="text-sm text-muted-foreground">
            Recording and transcription are consent-gated and off by default.
          </p>
        </div>
      </div>

      <ScheduleForm
        isSubmitting={schedule.isPending}
        errorMessage={(schedule.error as Error | null)?.message}
        onSubmit={(input) =>
          schedule.mutate(input, {
            onSuccess: (meeting) => navigate(`/app/meetings/${meeting.id}`),
          })
        }
      />
    </div>
  );
}
