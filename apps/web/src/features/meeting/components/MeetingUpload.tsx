import { useRef, useState } from 'react';
import { FileAudio, FileText } from 'lucide-react';
import type { MeetingDetailDTO } from '@vaani/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIngestTranscript, useTranscribeAudio } from '../useMeetings';

interface MeetingUploadProps {
  meeting: MeetingDetailDTO;
}

/** Reads a File as a base64 data-URL (for the audio transcribe endpoint). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * AVD-friendly analysis input: drop EITHER an already-recorded audio file (real
 * Whisper STT → analysis) OR a Teams `.vtt`/plain-text transcript (parsed → analysis).
 * Consent gating stays visible: both paths require transcription enabled + transcript
 * consent on the meeting's recording session (enforced server-side, CLAUDE.md §13).
 */
export function MeetingUpload({ meeting }: MeetingUploadProps) {
  const audioRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const transcribe = useTranscribeAudio(meeting.id);
  const ingest = useIngestTranscript(meeting.id);

  const consentGranted = meeting.recording?.recordingConsent === true;
  const transcriptConsent = meeting.transcriptionEnabled;
  const busy = transcribe.isPending || ingest.isPending;
  const error =
    (transcribe.error as Error | null)?.message ?? (ingest.error as Error | null)?.message ?? null;

  async function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    const dataUrl = await fileToDataUrl(file);
    await transcribe.mutateAsync({ audio: dataUrl });
    setStatus('Recording transcribed — analysis updated.');
    if (audioRef.current) audioRef.current.value = '';
  }

  async function onTranscript(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    const content = await file.text();
    const format = file.name.toLowerCase().endsWith('.vtt') ? 'vtt' : 'auto';
    await ingest.mutateAsync({ content, format });
    setStatus('Transcript ingested — analysis updated.');
    if (transcriptRef.current) transcriptRef.current.value = '';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Provide a recording or transcript</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          On AVD you can drop an already-recorded audio file (real speech-to-text) or a Teams
          transcript (<code>.vtt</code>) / plain-text notes. Either one runs the AI analysis.
        </p>

        {!transcriptConsent && (
          <p className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Transcription is disabled for this meeting. Enable it (and grant transcript consent
            when starting the recording) before uploading — capture is never covert.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="upload-audio" className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <FileAudio className="h-4 w-4" /> Upload recording
            </span>
            <input
              id="upload-audio"
              ref={audioRef}
              type="file"
              accept="audio/*"
              disabled={busy || !transcriptConsent}
              onChange={onAudio}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm disabled:opacity-50"
            />
          </label>

          <label htmlFor="upload-transcript" className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="h-4 w-4" /> Upload transcript
            </span>
            <input
              id="upload-transcript"
              ref={transcriptRef}
              type="file"
              accept=".vtt,.txt,text/vtt,text/plain"
              disabled={busy || !transcriptConsent}
              onChange={onTranscript}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm disabled:opacity-50"
            />
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Consent: recording {consentGranted ? 'granted' : 'not yet granted'}. Transcript upload is
          consent-gated server-side and never fabricates speakers or content.
        </p>

        {busy && <p className="text-xs text-muted-foreground">Processing…</p>}
        {status && <p className="text-xs text-success">{status}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
