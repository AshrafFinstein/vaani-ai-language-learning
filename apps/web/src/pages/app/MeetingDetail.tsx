import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { MEETING_PROVIDERS } from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMeeting } from '@/features/meeting/useMeetings';
import { RecordingControls } from '@/features/meeting/components/RecordingControls';
import { MeetingAnalysis } from '@/features/meeting/components/MeetingAnalysis';
import { PrivacyPanel } from '@/features/meeting/components/PrivacyPanel';

type Tab = 'analysis' | 'recording' | 'privacy';

const TABS: { id: Tab; label: string }[] = [
  { id: 'analysis', label: 'Analysis' },
  { id: 'recording', label: 'Recording' },
  { id: 'privacy', label: 'Privacy' },
];

function providerLabel(value: string): string {
  return MEETING_PROVIDERS.find((p) => p.value === value)?.label ?? value;
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meeting, isLoading } = useMeeting(id);
  const [tab, setTab] = useState<Tab>('analysis');

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading meeting…</p>;
  }
  if (!meeting) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Meeting not found.</p>
        <Button asChild variant="link" className="px-0">
          <Link to="/app/meetings">Back to meetings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link to="/app/meetings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(meeting.scheduledStart).toLocaleString()} —{' '}
            {new Date(meeting.scheduledEnd).toLocaleTimeString()} · {providerLabel(meeting.provider)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No participants listed.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {meeting.participants.map((p) => (
                <Badge key={p.id} variant="secondary" className="gap-1">
                  {p.name}
                  {p.role ? ` · ${p.role}` : ''}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-1 rounded-lg border p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'analysis' && <MeetingAnalysis meeting={meeting} />}
      {tab === 'recording' && (
        <RecordingControls meetingId={meeting.id} recording={meeting.recording} />
      )}
      {tab === 'privacy' && <PrivacyPanel meetingId={meeting.id} />}
    </div>
  );
}
