import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { MeetingPrivacySettings } from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useMeetingSettings,
  useUpdateMeetingSettings,
  useDeleteRecording,
  useDeleteTranscript,
} from '../useMeetings';

interface PrivacyPanelProps {
  /** When provided, shows per-meeting delete controls for recording/transcript. */
  meetingId?: string;
}

export function PrivacyPanel({ meetingId }: PrivacyPanelProps) {
  const { data: settings } = useMeetingSettings();
  const update = useUpdateMeetingSettings();
  const [form, setForm] = useState<MeetingPrivacySettings | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const deleteRecording = useDeleteRecording(meetingId ?? '');
  const deleteTranscript = useDeleteTranscript(meetingId ?? '');

  if (!form) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading privacy settings…
        </CardContent>
      </Card>
    );
  }

  function set<K extends keyof MeetingPrivacySettings>(key: K, value: MeetingPrivacySettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent &amp; recording defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Toggle
            id="pref-recording-consent"
            label="Recording consent granted by default"
            checked={form.recordingConsent}
            onChange={(v) => set('recordingConsent', v)}
          />
          <Toggle
            id="pref-transcript-consent"
            label="Transcript consent granted by default"
            checked={form.transcriptConsent}
            onChange={(v) => set('transcriptConsent', v)}
          />
          <Toggle
            id="pref-auto-record"
            label="Auto-record meetings"
            checked={form.autoRecord}
            onChange={(v) => set('autoRecord', v)}
          />
          <Toggle
            id="pref-auto-transcribe"
            label="Auto-transcribe meetings"
            checked={form.autoTranscribe}
            onChange={(v) => set('autoTranscribe', v)}
          />
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="pref-retention">Retention (days)</Label>
            <Input
              id="pref-retention"
              type="number"
              min={1}
              max={3650}
              value={form.retentionDays}
              onChange={(e) => set('retentionDays', Number(e.target.value))}
              className="max-w-[120px]"
            />
          </div>
          <Button
            variant="gradient"
            disabled={update.isPending}
            onClick={() => update.mutate(form)}
          >
            {update.isPending ? 'Saving…' : 'Save settings'}
          </Button>
          {update.isSuccess && <p className="text-xs text-success">Settings saved.</p>}
        </CardContent>
      </Card>

      {meetingId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delete stored data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Permanently remove the stored recording session or transcript for this meeting.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={deleteRecording.isPending}
                onClick={() => deleteRecording.mutate()}
              >
                <Trash2 className="h-4 w-4" /> Delete recording
              </Button>
              <Button
                variant="destructive"
                disabled={deleteTranscript.isPending}
                onClick={() => deleteTranscript.mutate()}
              >
                <Trash2 className="h-4 w-4" /> Delete transcript
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
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
