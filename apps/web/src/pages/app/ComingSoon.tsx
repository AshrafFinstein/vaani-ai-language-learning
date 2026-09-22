import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/** Placeholder for authenticated features that ship in later phases. */
export default function ComingSoonPage() {
  const { pathname } = useLocation();
  const name = pathname.split('/').pop() ?? 'This feature';
  const label = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div className="flex min-h-[60vh] items-center justify-center animate-fade-in">
      <Card className="max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-10">
          <div className="vaani-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white">
            <Hammer className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold">{label} is coming soon</h1>
            <p className="text-sm text-muted-foreground">
              This part of Vaani AI is being built in an upcoming phase. Check back shortly!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
