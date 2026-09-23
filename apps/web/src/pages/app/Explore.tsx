import { ExploreView } from '@/features/explore/ExploreView';
import { useExplore } from '@/features/explore/useExplore';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExplorePage() {
  const { data, isLoading } = useExplore();

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Explore</h1>
        <p className="text-muted-foreground">
          {data?.intro ?? 'Discover fresh things to practice across every mode.'}
        </p>
      </header>

      {isLoading || !data ? (
        <div className="space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <ExploreView payload={data} />
      )}
    </div>
  );
}
