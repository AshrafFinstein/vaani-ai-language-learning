import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalAudioCaptureProvider,
  createMeetingCaptureProvider,
  createWebResearchProvider,
  GraphMeetingCaptureProvider,
  MeetingCaptureConfigError,
  MeetingCaptureDisabledError,
  MeetingCaptureUnsupportedError,
  parseVtt,
  ResearchDisabledError,
  type GraphTokenProvider,
} from '@vaani/meeting';

const ref = { organizerId: 'org1', meetingId: 'm1' };
const fakeToken: GraphTokenProvider = { getToken: async () => 'faketoken' };

const VTT = [
  'WEBVTT',
  '',
  '00:00:01.000 --> 00:00:04.000',
  '<v Ashraf>Hello team, let us start the review.',
  '',
  '00:00:05.000 --> 00:00:09.500',
  '<v Dinesh>I finished the coding standards draft.',
].join('\n');

function okJson(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}
function okText(text: string) {
  return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(text) } as Response);
}

/** Routes Graph requests by URL so the provider can be exercised without real Azure. */
function graphFetchMock(input: string | URL | Request): Promise<Response> {
  const u = String(input);
  if (u.includes('/transcripts/') && u.includes('/content')) return okText(VTT);
  if (u.includes('/transcripts')) return okJson({ value: [{ id: 't1' }] });
  if (u.includes('/recordings')) {
    return okJson({ value: [{ id: 'r1', recordingContentUrl: 'https://rec.example/vid.mp4' }] });
  }
  return okJson({
    id: 'm1',
    subject: 'Sprint sync',
    participants: {
      organizer: { upn: 'ashraf@org', role: 'organizer', identity: { user: { id: 'u1', displayName: 'Ashraf' } } },
      attendees: [{ upn: 'dinesh@org', identity: { user: { id: 'u2', displayName: 'Dinesh' } } }],
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('parseVtt', () => {
  it('parses speaker-labelled cues into segments', () => {
    const segments = parseVtt(VTT);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ speakerLabel: 'Ashraf', startMs: 1000, endMs: 4000 });
    expect(segments[0]!.text).toContain('start the review');
    expect(segments[1]!.speakerLabel).toBe('Dinesh');
  });
  it('returns [] for empty input (never invents content)', () => {
    expect(parseVtt('WEBVTT\n\n')).toEqual([]);
    expect(parseVtt('')).toEqual([]);
  });
});

describe('createMeetingCaptureProvider (feature flags)', () => {
  it('defaults to a disabled provider that throws on use', async () => {
    const provider = createMeetingCaptureProvider();
    expect(provider.isConfigured()).toBe(false);
    await expect(provider.getTranscript(ref)).rejects.toBeInstanceOf(MeetingCaptureDisabledError);
  });

  it('stays disabled when graph is selected but MEETING_CAPTURE_GRAPH is off', async () => {
    const provider = createMeetingCaptureProvider({ captureProvider: 'graph', graphEnabled: false });
    expect(provider.name).toBe('disabled');
    await expect(provider.getRecording(ref)).rejects.toBeInstanceOf(MeetingCaptureDisabledError);
  });

  it('returns the Graph provider when enabled, but errors clearly without credentials', async () => {
    const provider = createMeetingCaptureProvider({ captureProvider: 'graph', graphEnabled: true });
    expect(provider.name).toBe('graph');
    expect(provider.isConfigured()).toBe(false); // no creds
    await expect(provider.getTranscript(ref)).rejects.toBeInstanceOf(MeetingCaptureConfigError);
  });
});

describe('GraphMeetingCaptureProvider (fetch-mocked, no real Azure)', () => {
  it('retrieves a real transcript, participants, and recording', async () => {
    vi.stubGlobal('fetch', vi.fn(graphFetchMock));
    const provider = new GraphMeetingCaptureProvider({
      enabled: true,
      tenantId: 't',
      clientId: 'c',
      clientSecret: 's',
      tokenProvider: fakeToken,
    });
    expect(provider.isConfigured()).toBe(true);

    const transcript = await provider.getTranscript(ref);
    expect(transcript.segments).toHaveLength(2);
    expect(transcript.diarized).toBe(true);
    expect(transcript.source).toBe('graph:transcript');

    const participants = await provider.getParticipants(ref);
    expect(participants.map((p) => p.name)).toEqual(['Ashraf', 'Dinesh']);

    const recording = await provider.getRecording(ref);
    expect(recording.contentUrl).toBe('https://rec.example/vid.mp4');
  });

  it('does not fabricate a transcript when none exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((u: string | URL | Request) =>
        String(u).includes('/transcripts') ? okJson({ value: [] }) : okJson({ id: 'm1' }),
      ),
    );
    const provider = new GraphMeetingCaptureProvider({
      enabled: true,
      tenantId: 't',
      clientId: 'c',
      clientSecret: 's',
      tokenProvider: fakeToken,
    });
    const transcript = await provider.getTranscript(ref);
    expect(transcript.segments).toEqual([]);
  });
});

describe('local audio capture (scaffold)', () => {
  it('reports unsupported and throws a clear error', async () => {
    const local = createLocalAudioCaptureProvider();
    expect(local.isSupported()).toBe(false);
    await expect(local.start()).rejects.toBeInstanceOf(MeetingCaptureUnsupportedError);
  });
});

describe('web research (Apify, independent + opt-in)', () => {
  it('is disabled by default', async () => {
    const research = createWebResearchProvider();
    expect(research.isEnabled()).toBe(false);
    await expect(research.search('anything')).rejects.toBeInstanceOf(ResearchDisabledError);
  });

  it('activates only with APIFY_ENABLED and a token', () => {
    const research = createWebResearchProvider({ apifyEnabled: true, apifyApiToken: 'tok' });
    expect(research.name).toBe('apify');
    expect(research.isEnabled()).toBe(true);
  });
});
