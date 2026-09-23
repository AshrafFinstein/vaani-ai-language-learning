import type { LocalAudioCaptureProvider, MeetingCaptureProvider } from './types.js';
import { GraphMeetingCaptureProvider } from './graph-capture.js';
import { DisabledMeetingCaptureProvider } from './disabled-capture.js';
import { UnsupportedLocalAudioCaptureProvider } from './local-capture.js';

export interface MeetingCaptureEnv {
  /** MEETING_CAPTURE_PROVIDER — 'graph' | 'local' | 'disabled' (default). */
  captureProvider?: string;
  /** MEETING_CAPTURE_GRAPH — master on/off for the Graph provider. */
  graphEnabled?: boolean;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  graphBaseUrl?: string;
}

/**
 * Selects the meeting CAPTURE provider from configuration. Returns the disabled
 * provider by default so development/tests never need Azure credentials. The Graph
 * provider is returned only when `MEETING_CAPTURE_PROVIDER=graph` AND
 * `MEETING_CAPTURE_GRAPH=true`; if credentials are missing it still constructs but its
 * calls raise a clear config error (it never fabricates a successful capture).
 */
export function createMeetingCaptureProvider(env: MeetingCaptureEnv = {}): MeetingCaptureProvider {
  const which = (env.captureProvider ?? 'disabled').toLowerCase();
  if (which === 'graph' && env.graphEnabled) {
    return new GraphMeetingCaptureProvider({
      enabled: true,
      tenantId: env.azureTenantId ?? '',
      clientId: env.azureClientId ?? '',
      clientSecret: env.azureClientSecret ?? '',
      graphBaseUrl: env.graphBaseUrl,
    });
  }
  const reason =
    which === 'graph'
      ? 'Graph meeting capture is selected but disabled (set MEETING_CAPTURE_GRAPH=true).'
      : 'Meeting capture is disabled — using the mock transcript pipeline.';
  return new DisabledMeetingCaptureProvider(reason);
}

/** Local/AVD audio capture is unsupported on the server; a desktop agent is a later phase. */
export function createLocalAudioCaptureProvider(): LocalAudioCaptureProvider {
  return new UnsupportedLocalAudioCaptureProvider();
}
