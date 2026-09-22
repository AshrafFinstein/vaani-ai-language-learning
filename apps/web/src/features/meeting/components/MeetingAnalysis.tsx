import type { ReactNode } from 'react';
import type { MeetingDetailDTO } from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionItemsTable } from './ActionItemsTable';

/** Renders the full analysis for a meeting: overview, discussion, decisions,
 *  risks, questions, action items, and next steps. */
export function MeetingAnalysis({ meeting }: { meeting: MeetingDetailDTO }) {
  const { summary, decisions, actionItems } = meeting;

  if (meeting.analysisStatus !== 'COMPLETED' || !summary) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {meeting.analysisStatus === 'PROCESSING'
            ? 'Analysis is in progress…'
            : meeting.analysisStatus === 'FAILED'
              ? 'Analysis failed. Try recording again.'
              : 'Analysis will appear here after you stop the recording.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Section title="Overview">
        <p className="text-sm text-muted-foreground">{summary.overview}</p>
      </Section>

      <Section title="Discussion points">
        <BulletList items={summary.discussionPoints} empty="No discussion points recorded." />
      </Section>

      <Section title="Key decisions">
        {decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions were recorded.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {decisions.map((d) => (
              <li key={d.id} className="rounded-md border p-3">
                <p>{d.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Decided by:{' '}
                  <span className={d.decidedBy === 'Unassigned' ? 'italic' : 'font-medium'}>
                    {d.decidedBy}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Risks & blockers">
        <BulletList items={summary.risks} empty="No risks or blockers were raised." />
      </Section>

      <Section title="Questions">
        <BulletList items={summary.questions} empty="No open questions were raised." />
      </Section>

      <Section title="Action items">
        <ActionItemsTable items={actionItems} />
      </Section>

      <Section title="Next steps">
        <BulletList items={summary.nextSteps} empty="No next steps were recorded." />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
