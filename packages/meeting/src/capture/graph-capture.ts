import {
  MeetingCaptureConfigError,
  MeetingCaptureDisabledError,
  type CapturedMeetingMetadata,
  type CapturedParticipant,
  type CapturedRecording,
  type CapturedTranscript,
  type MeetingCaptureProvider,
  type MeetingRef,
} from './types.js';
import {
  ClientCredentialsTokenProvider,
  type GraphAuthConfig,
  type GraphTokenProvider,
} from './graph-auth.js';
import { parseVtt } from './vtt.js';

export interface GraphCaptureConfig extends GraphAuthConfig {
  /** MEETING_CAPTURE_GRAPH — the provider is inactive unless this is true. */
  enabled: boolean;
  /** Graph API base; defaults to the public cloud v1.0 endpoint. */
  graphBaseUrl?: string;
  /** Injectable for tests so no real Azure/Graph is needed. */
  tokenProvider?: GraphTokenProvider;
}

// Minimal shapes for just the fields we read from Graph responses.
interface GraphOnlineMeeting {
  id: string;
  subject?: string | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  joinWebUrl?: string | null;
  participants?: {
    organizer?: GraphParticipantInfo | null;
    attendees?: GraphParticipantInfo[] | null;
  };
}
interface GraphParticipantInfo {
  upn?: string | null;
  role?: string | null;
  identity?: { user?: { id?: string | null; displayName?: string | null } | null } | null;
}
interface GraphList<T> {
  value?: T[];
}
interface GraphTranscript {
  id: string;
  transcriptContentUrl?: string | null;
}
interface GraphRecording {
  id: string;
  recordingContentUrl?: string | null;
}

/**
 * Retrieves REAL Teams meeting artifacts via Microsoft Graph (app-only). It reads only
 * what the org has already recorded/transcribed with consent — it does not capture live
 * audio and never fabricates data. Inactive unless `MEETING_CAPTURE_GRAPH=true` AND the
 * Azure app credentials are present.
 *
 * Required Graph application permissions (admin-consented):
 *   - OnlineMeetings.Read.All            (meeting metadata + participants)
 *   - OnlineMeetingTranscript.Read.All   (transcripts)
 *   - OnlineMeetingRecording.Read.All    (recordings)
 * See docs/MEETING_CAPTURE.md — permissions MUST be validated against the exact APIs.
 */
export class GraphMeetingCaptureProvider implements MeetingCaptureProvider {
  readonly name = 'graph';
  private readonly base: string;
  private readonly token: GraphTokenProvider;

  constructor(private readonly config: GraphCaptureConfig) {
    this.base = (config.graphBaseUrl ?? 'https://graph.microsoft.com/v1.0').replace(/\/$/, '');
    this.token = config.tokenProvider ?? new ClientCredentialsTokenProvider(config);
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.enabled &&
        this.config.tenantId &&
        this.config.clientId &&
        this.config.clientSecret,
    );
  }

  /** Guards every call: clear, distinct errors for "disabled" vs "misconfigured". */
  private ensureReady(): void {
    if (!this.config.enabled) {
      throw new MeetingCaptureDisabledError(
        'Graph meeting capture is disabled (set MEETING_CAPTURE_GRAPH=true to enable).',
      );
    }
    if (!this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
      throw new MeetingCaptureConfigError(
        'Graph capture is enabled but missing AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET.',
      );
    }
  }

  private async graphGet<T>(path: string): Promise<T> {
    this.ensureReady();
    const token = await this.token.getToken();
    const res = await fetch(`${this.base}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Graph GET ${path} failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  private async graphGetText(path: string, accept: string): Promise<string> {
    this.ensureReady();
    const token = await this.token.getToken();
    const res = await fetch(`${this.base}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: accept },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Graph GET ${path} failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    return res.text();
  }

  private async resolveMeetingId(ref: MeetingRef): Promise<string> {
    if (ref.meetingId) return ref.meetingId;
    if (!ref.joinWebUrl) {
      throw new MeetingCaptureConfigError('MeetingRef requires either meetingId or joinWebUrl.');
    }
    const filter = encodeURIComponent(`JoinWebUrl eq '${ref.joinWebUrl}'`);
    const data = await this.graphGet<GraphList<GraphOnlineMeeting>>(
      `/users/${ref.organizerId}/onlineMeetings?$filter=${filter}`,
    );
    const id = data.value?.[0]?.id;
    if (!id) throw new Error('No onlineMeeting found for the given joinWebUrl.');
    return id;
  }

  async getMeetingMetadata(ref: MeetingRef): Promise<CapturedMeetingMetadata> {
    const id = await this.resolveMeetingId(ref);
    const m = await this.graphGet<GraphOnlineMeeting>(
      `/users/${ref.organizerId}/onlineMeetings/${id}`,
    );
    return {
      id: m.id,
      subject: m.subject ?? null,
      provider: 'TEAMS',
      startDateTime: m.startDateTime ?? null,
      endDateTime: m.endDateTime ?? null,
      joinWebUrl: m.joinWebUrl ?? null,
    };
  }

  async getParticipants(ref: MeetingRef): Promise<CapturedParticipant[]> {
    const id = await this.resolveMeetingId(ref);
    const m = await this.graphGet<GraphOnlineMeeting>(
      `/users/${ref.organizerId}/onlineMeetings/${id}`,
    );
    const map = (p: GraphParticipantInfo | null | undefined, role: string): CapturedParticipant | null =>
      p
        ? {
            id: p.identity?.user?.id ?? null,
            name: p.identity?.user?.displayName ?? null,
            email: p.upn ?? null,
            role: p.role ?? role,
          }
        : null;
    const organizer = map(m.participants?.organizer, 'organizer');
    const attendees = (m.participants?.attendees ?? []).map((a) => map(a, 'attendee'));
    // Only real, source-provided participants — never fabricated.
    return [organizer, ...attendees].filter((p): p is CapturedParticipant => p !== null);
  }

  async getTranscript(ref: MeetingRef): Promise<CapturedTranscript> {
    const id = await this.resolveMeetingId(ref);
    const list = await this.graphGet<GraphList<GraphTranscript>>(
      `/users/${ref.organizerId}/onlineMeetings/${id}/transcripts`,
    );
    const transcript = list.value?.[0];
    if (!transcript) {
      // No transcript exists — return empty, do NOT fabricate one.
      return { language: 'en', segments: [], diarized: false, source: 'graph:transcript' };
    }
    const vtt = await this.graphGetText(
      `/users/${ref.organizerId}/onlineMeetings/${id}/transcripts/${transcript.id}/content?$format=text/vtt`,
      'text/vtt',
    );
    const segments = parseVtt(vtt);
    return {
      language: 'en',
      segments,
      diarized: segments.some((s) => s.speakerLabel && s.speakerLabel !== 'Unknown'),
      source: 'graph:transcript',
    };
  }

  async getRecording(ref: MeetingRef): Promise<CapturedRecording> {
    const id = await this.resolveMeetingId(ref);
    const list = await this.graphGet<GraphList<GraphRecording>>(
      `/users/${ref.organizerId}/onlineMeetings/${id}/recordings`,
    );
    const recording = list.value?.[0];
    return {
      contentUrl: recording?.recordingContentUrl ?? null,
      mimeType: recording ? 'video/mp4' : null,
      sizeBytes: null,
      source: 'graph:recording',
    };
  }
}
