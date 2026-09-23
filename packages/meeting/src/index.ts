export * from './types.js';
export { MockMeetingAnalysisProvider } from './mock-analyzer.js';
export { MockMeetingTranscriptProvider } from './mock-transcript.js';
export {
  createMeetingAnalysisProvider,
  createMeetingTranscriptProvider,
  type MeetingProviderEnv,
} from './factory.js';

// Meeting CAPTURE layer (official Graph retrieval + local/AVD scaffold).
export * from './capture/types.js';
export { parseVtt } from './capture/vtt.js';
export {
  ClientCredentialsTokenProvider,
  type GraphAuthConfig,
  type GraphTokenProvider,
} from './capture/graph-auth.js';
export { GraphMeetingCaptureProvider, type GraphCaptureConfig } from './capture/graph-capture.js';
export { DisabledMeetingCaptureProvider } from './capture/disabled-capture.js';
export { UnsupportedLocalAudioCaptureProvider } from './capture/local-capture.js';
export {
  createMeetingCaptureProvider,
  createLocalAudioCaptureProvider,
  type MeetingCaptureEnv,
} from './capture/factory.js';

// Optional, independent web-research provider (Apify).
export * from './research/types.js';
export {
  ApifyResearchProvider,
  DisabledResearchProvider,
  createWebResearchProvider,
  type ApifyConfig,
  type ResearchEnv,
} from './research/apify.js';
