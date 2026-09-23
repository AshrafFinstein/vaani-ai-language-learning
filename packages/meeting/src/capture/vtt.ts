import type { CapturedTranscriptSegment } from './types.js';

/** Parses an HH:MM:SS.mmm (or MM:SS.mmm) WebVTT timestamp into milliseconds. */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':');
  if (parts.length < 2) return 0;
  const secondsPart = parts[parts.length - 1]!;
  const minutes = Number(parts[parts.length - 2] ?? '0');
  const hours = parts.length >= 3 ? Number(parts[parts.length - 3] ?? '0') : 0;
  const [sec, ms] = secondsPart.split('.');
  return (
    hours * 3_600_000 + minutes * 60_000 + Number(sec ?? '0') * 1000 + Number((ms ?? '0').padEnd(3, '0'))
  );
}

/**
 * Parses Microsoft Graph WebVTT transcript content into speaker-labelled segments.
 * Speaker names come from the `<v Name>` voice tag; text has all tags stripped.
 * Returns `[]` for empty/blank input — it never invents content.
 */
export function parseVtt(vtt: string): CapturedTranscriptSegment[] {
  const segments: CapturedTranscriptSegment[] = [];
  // Cues are separated by blank lines; a cue has an optional id, a timing line, and text.
  const blocks = vtt.replace(/\r\n/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() && l.trim() !== 'WEBVTT');
    const timingLine = lines.find((l) => l.includes('-->'));
    if (!timingLine) continue;

    const [start, end] = timingLine.split('-->').map((s) => s.trim());
    const startMs = parseTimestamp(start ?? '0');
    const endMs = parseTimestamp((end ?? '0').split(/\s/)[0] ?? '0');

    const textLines = lines.slice(lines.indexOf(timingLine) + 1);
    const raw = textLines.join(' ').trim();
    if (!raw) continue;

    // Speaker from <v Speaker Name>...; default to "Unknown" (never fabricated identity).
    const voiceMatch = raw.match(/<v\s+([^>]+)>/i);
    const speakerLabel = voiceMatch?.[1]?.trim() || 'Unknown';
    const text = raw.replace(/<[^>]+>/g, '').trim();
    if (!text) continue;

    segments.push({ speakerLabel, text, startMs, endMs });
  }

  return segments;
}
