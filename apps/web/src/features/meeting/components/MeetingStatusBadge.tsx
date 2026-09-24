import type { MeetingStatus } from '@vaani/types';
import { Badge } from '@/components/ui/badge';

/** Maps a lifecycle status to a user-facing label + badge variant. */
const STATUS_META: Record<
  MeetingStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  SCHEDULED: { label: 'Upcoming', variant: 'outline' },
  NOTIFIED: { label: 'Upcoming', variant: 'secondary' },
  STARTED: { label: 'Started', variant: 'default' },
  CAPTURING: { label: 'Capturing', variant: 'destructive' },
  PROCESSING: { label: 'Processing', variant: 'secondary' },
  COMPLETED: { label: 'Completed', variant: 'outline' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const meta = STATUS_META[status];
  const pulsing = status === 'CAPTURING' || status === 'STARTED';
  return (
    <Badge variant={meta.variant} className="gap-1.5">
      {pulsing && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {meta.label}
    </Badge>
  );
}
