import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  MEETING_PROVIDERS,
  ScheduleMeetingInput,
  type MeetingProvider,
  type ScheduleParticipantInput,
} from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ScheduleFormProps {
  onSubmit: (input: ScheduleMeetingInput) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
}

type ParticipantRow = { name: string; email: string; role: string };

export function ScheduleForm({ onSubmit, isSubmitting, errorMessage }: ScheduleFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [provider, setProvider] = useState<MeetingProvider>('TEAMS');
  const [participants, setParticipants] = useState<ParticipantRow[]>([
    { name: '', email: '', role: '' },
  ]);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function updateParticipant(i: number, patch: Partial<ParticipantRow>) {
    setParticipants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanedParticipants: ScheduleParticipantInput[] = participants
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        email: p.email.trim() ? p.email.trim() : '',
        role: p.role.trim() || undefined,
      }));

    const candidate = {
      title: title.trim(),
      date,
      startTime,
      endTime,
      provider,
      participants: cleanedParticipants,
      recordingEnabled,
      transcriptionEnabled,
      aiAnalysisEnabled,
    };

    const parsed = ScheduleMeetingInput.safeParse(candidate);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meeting details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint planning"
            />
            {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="meeting-date">Date</Label>
              <Input
                id="meeting-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {fieldErrors.date && <p className="text-xs text-destructive">{fieldErrors.date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting-start">Start time</Label>
              <Input
                id="meeting-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              {fieldErrors.startTime && (
                <p className="text-xs text-destructive">{fieldErrors.startTime}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting-end">End time</Label>
              <Input
                id="meeting-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              {fieldErrors.endTime && (
                <p className="text-xs text-destructive">{fieldErrors.endTime}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-provider">Provider</Label>
            <select
              id="meeting-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as MeetingProvider)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {MEETING_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} — {p.description}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Participants</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setParticipants((r) => [...r, { name: '', email: '', role: '' }])}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {participants.map((p, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Input
                aria-label={`Participant ${i + 1} name`}
                value={p.name}
                onChange={(e) => updateParticipant(i, { name: e.target.value })}
                placeholder="Name"
              />
              <Input
                aria-label={`Participant ${i + 1} email`}
                value={p.email}
                onChange={(e) => updateParticipant(i, { email: e.target.value })}
                placeholder="Email (optional)"
              />
              <Input
                aria-label={`Participant ${i + 1} role`}
                value={p.role}
                onChange={(e) => updateParticipant(i, { role: e.target.value })}
                placeholder="Role (optional)"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove participant ${i + 1}`}
                onClick={() => setParticipants((rows) => rows.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Participants supplied here are the only people the analyzer may reference — it never
            invents attendees.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recording &amp; analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            id="toggle-recording"
            label="Enable recording"
            description="Recording still requires explicit consent when you start it."
            checked={recordingEnabled}
            onChange={setRecordingEnabled}
          />
          <ToggleRow
            id="toggle-transcription"
            label="Enable transcription"
            description="Produce a speaker-labelled transcript (mock in this phase)."
            checked={transcriptionEnabled}
            onChange={setTranscriptionEnabled}
          />
          <ToggleRow
            id="toggle-ai"
            label="Enable AI analysis"
            description="Summarise decisions and action items after the meeting stops."
            checked={aiAnalysisEnabled}
            onChange={setAiAnalysisEnabled}
          />
        </CardContent>
      </Card>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Button type="submit" variant="gradient" disabled={isSubmitting}>
        {isSubmitting ? 'Scheduling…' : 'Schedule meeting'}
      </Button>
    </form>
  );
}

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-input"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
