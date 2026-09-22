import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DebatePicker } from '@/features/debate/DebatePicker';
import { DebateRoom } from '@/features/debate/DebateRoom';
import { useStartDebate } from '@/features/debate/useDebate';

function BackButton({ to }: { to: string }) {
  return (
    <Button asChild variant="ghost" size="icon" aria-label="Back to debate topics">
      <Link to={to}>
        <ArrowLeft className="h-5 w-5" />
      </Link>
    </Button>
  );
}

export default function DebatePage() {
  const { id } = useParams<{ id: string }>();
  const start = useStartDebate();

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px]">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {id ? (
          <DebateRoom key={id} id={id} headerLeft={<BackButton to="/app/debate" />} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <DebatePicker
              isPending={start.isPending}
              onStart={(topicKey, side, level) => start.mutate({ topicKey, side, level })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
