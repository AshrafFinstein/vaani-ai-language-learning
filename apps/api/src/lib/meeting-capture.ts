import {
  createMeetingCaptureProvider,
  createWebResearchProvider,
  type MeetingCaptureProvider,
  type WebResearchProvider,
} from '@vaani/meeting';
import { env } from '../env.js';

let captureProvider: MeetingCaptureProvider | undefined;
let researchProvider: WebResearchProvider | undefined;

/**
 * Lazily-built meeting CAPTURE provider selected from env. Disabled by default — the
 * existing mock-transcript pipeline stays in charge until MEETING_CAPTURE_GRAPH=true and
 * Azure credentials are supplied. Kept behind a getter so no credentials are needed at
 * import time (dev/tests).
 */
export function getMeetingCaptureProvider(): MeetingCaptureProvider {
  if (!captureProvider) {
    captureProvider = createMeetingCaptureProvider({
      captureProvider: env.MEETING_CAPTURE_PROVIDER,
      graphEnabled: env.MEETING_CAPTURE_GRAPH,
      azureTenantId: env.AZURE_TENANT_ID,
      azureClientId: env.AZURE_CLIENT_ID,
      azureClientSecret: env.AZURE_CLIENT_SECRET,
      graphBaseUrl: env.GRAPH_BASE_URL,
    });
  }
  return captureProvider;
}

/** Lazily-built, opt-in web-research provider (Apify). Disabled unless APIFY_ENABLED + token. */
export function getWebResearchProvider(): WebResearchProvider {
  if (!researchProvider) {
    researchProvider = createWebResearchProvider({
      apifyEnabled: env.APIFY_ENABLED,
      apifyApiToken: env.APIFY_API_TOKEN,
      apifyActorId: env.APIFY_ACTOR_ID,
    });
  }
  return researchProvider;
}
