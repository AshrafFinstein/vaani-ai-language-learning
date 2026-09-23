import { useEffect, useRef, useState } from 'react';
import { CalendarCheck2, Lock, Upload } from 'lucide-react';
import type { CalendarProviderKind, MeetingPrivacySettings } from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  useMeetingSettings,
  useUpdateMeetingSettings,
  useCalendarStatus,
  useSetIcsCalendar,
  useImportIcs,
} from '../useMeetings';

/** Human label for the active calendar backend (Mock / Outlook / ICS). */
function calendarLabel(provider: CalendarProviderKind | undefined): string {
  if (provider === 'outlook') return 'Microsoft 365 (Outlook)';
  if (provider === 'ics') return 'Published ICS feed';
  return 'Mock (offline)';
}

/**
 * Meeting Intelligence Settings — extends MeetingSettings with automatic capture,
 * reminder-minutes, capture toggles, AI extraction toggles, the privacy "ask before
 * local capture" switch, and the read-only calendar-connection status (Mock vs Outlook).
 */
export function MeetingSettingsPanel() {
  const { data: settings } = useMeetingSettings();
  const { data: calendar } = useCalendarStatus();
  const update = useUpdateMeetingSettings();
  const [form, setForm] = useState<MeetingPrivacySettings | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading settings…
        </CardContent>
      </Card>
    );
  }

  function set<K extends keyof MeetingPrivacySettings>(key: K, value: MeetingPrivacySettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  return (
    <div className="space-y-5">
      {/* Calendar connection (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck2 className="h-4 w-4" /> Calendar connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={calendar?.connected ? 'default' : 'secondary'}>
              {calendarLabel(calendar?.provider)}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" /> Read-only
            </Badge>
            <p className="w-full text-xs text-muted-foreground">
              {calendar?.provider === 'ics'
                ? 'Connected via a published ICS feed (read-only) — no Azure admin consent needed. Vaani never writes to your calendar.'
                : calendar?.connected
                  ? 'Connected to your Outlook calendar (read-only). Vaani never writes to your calendar.'
                  : 'Using the offline mock calendar. Paste a published ICS link below (no admin needed), or configure Outlook (Graph).'}
            </p>
          </div>
          <IcsCalendarField />
        </CardContent>
      </Card>

      {/* Automation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            id="s-auto-capture"
            label="Automatic capture (calendar-driven)"
            checked={form.autoCapture}
            onChange={(v) => set('autoCapture', v)}
          />
          <div className="space-y-1.5">
            <Label htmlFor="s-reminder">Reminder (minutes before start)</Label>
            <Input
              id="s-reminder"
              type="number"
              min={0}
              max={1440}
              value={form.reminderMinutes}
              onChange={(e) => set('reminderMinutes', Number(e.target.value))}
              className="max-w-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Capture toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle id="s-cap-audio" label="Capture audio" checked={form.captureAudio} onChange={(v) => set('captureAudio', v)} />
          <Toggle id="s-cap-transcript" label="Capture transcript" checked={form.captureTranscript} onChange={(v) => set('captureTranscript', v)} />
          <Toggle id="s-cap-speaker" label="Capture speaker labels" checked={form.captureSpeaker} onChange={(v) => set('captureSpeaker', v)} />
          <Toggle
            id="s-ask-before"
            label="Ask before local capture (privacy)"
            checked={form.askBeforeCapture}
            onChange={(v) => set('askBeforeCapture', v)}
          />
          <p className="text-xs text-muted-foreground">
            Live local/AVD capture is deferred in this environment — capture is consent-gated and never covert.
          </p>
        </CardContent>
      </Card>

      {/* AI extraction toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle id="s-ex-summary" label="Summary" checked={form.extractSummary} onChange={(v) => set('extractSummary', v)} />
          <Toggle id="s-ex-decisions" label="Decisions" checked={form.extractDecisions} onChange={(v) => set('extractDecisions', v)} />
          <Toggle id="s-ex-actions" label="Action items" checked={form.extractActionItems} onChange={(v) => set('extractActionItems', v)} />
          <Toggle id="s-ex-questions" label="Questions" checked={form.extractQuestions} onChange={(v) => set('extractQuestions', v)} />
          <Toggle id="s-ex-topics" label="Important topics" checked={form.extractTopics} onChange={(v) => set('extractTopics', v)} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="gradient" disabled={update.isPending} onClick={() => update.mutate(form)}>
          {update.isPending ? 'Saving…' : 'Save settings'}
        </Button>
        {update.isSuccess && <p className="text-xs text-success">Settings saved.</p>}
      </div>
    </div>
  );
}

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

/**
 * Admin-free calendar connection: paste a published Outlook/Teams ICS feed URL (with a
 * short "how to publish" hint) OR import an exported `.ics` file. Both go through the
 * read-only ICS path — no Azure app registration / admin consent required.
 */
function IcsCalendarField() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const setIcs = useSetIcsCalendar();
  const importIcs = useImportIcs();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    const content = await file.text();
    const result = await importIcs.mutateAsync({ content });
    setStatus(`Imported ${result.created} new, ${result.updated} updated meeting(s).`);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onSaveUrl() {
    setStatus(null);
    const result = await setIcs.mutateAsync({ url });
    setStatus(
      url.trim() === ''
        ? 'Disconnected the ICS feed.'
        : `Synced ${result.created} new, ${result.updated} updated meeting(s).`,
    );
  }

  const error =
    (setIcs.error as Error | null)?.message ?? (importIcs.error as Error | null)?.message ?? null;

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <div className="space-y-1.5">
        <Label htmlFor="ics-url">Published ICS feed URL</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="ics-url"
            type="url"
            placeholder="https://outlook.office365.com/owa/calendar/.../calendar.ics"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-w-[240px] flex-1"
          />
          <Button variant="outline" disabled={setIcs.isPending} onClick={onSaveUrl}>
            {setIcs.isPending ? 'Saving…' : 'Save & sync'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          In Outlook on the web: Settings → Calendar → Shared calendars → Publish a calendar →
          choose your calendar → copy the ICS link. Paste it here (view-only; no admin needed).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ics-file" className="flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Import .ics file
        </Label>
        <input
          id="ics-file"
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          onChange={onFile}
          disabled={importIcs.isPending}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
      </div>

      {status && <p className="text-xs text-success">{status}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
