import { useState } from 'react';
import { Circle, Pause, Play, Square } from 'lucide-react';
import type { RecordingSessionDTO } from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useControlRecording, useStartRecording } from '../useMeetings';

interface RecordingControlsProps {
  meetingId: string;
  recording: RecordingSessionDTO | null;
}

/** Consent-gated recording controls with an always-visible recording indicator. */
export function RecordingControls({ meetingId, recording }: RecordingControlsProps) {
  const [consent, setConsent] = useState(false);
  const [transcriptConsent, setTranscriptConsent] = useState(false);
  const start = useStartRecording(meetingId);
  const control = useControlRecording(meetingId);

  const state = recording?.state ?? 'IDLE';
  const isRecording = state === 'RECORDING';
  const isPaused = state === 'PAUSED';
  const busy = start.isPending || control.isPending;

  const error =
    (start.error as Error | null)?.message ?? (control.error as Error | null)?.message ?? null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Recording</CardTitle>
        <RecordingIndicator state={state} />
      </CardHeader>
      <CardContent className="space-y-4">
        {state === 'IDLE' || state === 'STOPPED' ? (
          <div className="space-y-3">
            <label htmlFor="rec-consent" className="flex cursor-pointer items-start gap-2">
              <input
                id="rec-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span className="text-sm">
                I confirm all participants consent to this meeting being recorded.
              </span>
            </label>
            <label htmlFor="rec-transcript-consent" className="flex cursor-pointer items-start gap-2">
              <input
                id="rec-transcript-consent"
                type="checkbox"
                checked={transcriptConsent}
                onChange={(e) => setTranscriptConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span className="text-sm">Also consent to transcription.</span>
            </label>
            <Button
              variant="gradient"
              disabled={!consent || busy}
              onClick={() =>
                start.mutate({ recordingConsent: true, transcriptConsent })
              }
            >
              <Circle className="h-4 w-4 fill-current" /> Start recording
            </Button>
            <p className="text-xs text-muted-foreground">
              Recording cannot start without consent. This phase records session state only — no
              audio or video is captured.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isRecording && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => control.mutate({ action: 'PAUSE' })}
              >
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}
            {isPaused && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => control.mutate({ action: 'RESUME' })}
              >
                <Play className="h-4 w-4" /> Resume
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => control.mutate({ action: 'STOP' })}
            >
              <Square className="h-4 w-4" /> Stop
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function RecordingIndicator({ state }: { state: RecordingSessionDTO['state'] }) {
  if (state === 'RECORDING') {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden />
        Recording
      </Badge>
    );
  }
  if (state === 'PAUSED') {
    return (
      <Badge variant="muted" className="gap-1.5">
        <Pause className="h-3 w-3" /> Paused
      </Badge>
    );
  }
  if (state === 'STOPPED') {
    return <Badge variant="secondary">Stopped</Badge>;
  }
  return <Badge variant="outline">Not recording</Badge>;
}
