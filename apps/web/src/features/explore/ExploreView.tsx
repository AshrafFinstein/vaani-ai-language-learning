import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ExplorePayloadDTO, ExplorePickDTO } from '@vaani/types';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function PickCard({ pick }: { pick: ExplorePickDTO }) {
  return (
    <Link
      to={pick.to}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Open ${pick.title}`}
    >
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardHeader className="space-y-2">
          <span className="text-3xl" aria-hidden="true">
            {pick.emoji}
          </span>
          <CardTitle className="text-base">{pick.title}</CardTitle>
          <CardDescription>{pick.subtitle}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

/** Renders the daily Explore payload: a highlighted hero pick plus grouped sections. */
export function ExploreView({ payload }: { payload: ExplorePayloadDTO }) {
  const { highlight } = payload;

  return (
    <div className="space-y-8">
      <Link
        to={highlight.to}
        className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Featured: ${highlight.title}`}
      >
        <div className="vaani-gradient flex items-center gap-4 rounded-2xl p-6 text-white shadow-md transition-transform group-hover:-translate-y-0.5">
          <span className="text-5xl" aria-hidden="true">
            {highlight.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">Pick of the day</p>
            <h2 className="truncate text-xl font-bold">{highlight.title}</h2>
            <p className="truncate text-sm opacity-90">{highlight.subtitle}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0" />
        </div>
      </Link>

      {payload.sections.map((section) => (
        <section key={section.key} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.picks.map((pick) => (
              <PickCard key={`${pick.kind}-${pick.refKey}`} pick={pick} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
