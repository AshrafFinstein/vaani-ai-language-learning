import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoPicker } from '@/features/photo/PhotoPicker';
import { PhotoRoom } from '@/features/photo/PhotoRoom';
import { useStartPhotoSession } from '@/features/photo/usePhoto';

function BackButton({ to }: { to: string }) {
  return (
    <Button asChild variant="ghost" size="icon" aria-label="Back to photo picker">
      <Link to={to}>
        <ArrowLeft className="h-5 w-5" />
      </Link>
    </Button>
  );
}

export default function PhotoPage() {
  const { id } = useParams<{ id: string }>();
  const start = useStartPhotoSession();

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px]">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {id ? (
          <PhotoRoom key={id} id={id} headerLeft={<BackButton to="/app/photo" />} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <PhotoPicker
              isPending={start.isPending}
              onStart={(image, level) => start.mutate({ image, level })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
