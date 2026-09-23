import type { SynthesizeResult, TranscribeResult } from '@vaani/types';
import { api } from '@/lib/api';

/**
 * Optional server-side speech path (real STT/TTS via the backend provider abstraction).
 * The browser Web Speech API remains the default/offline path — this is only used when
 * the server-speech capability flag is enabled. Keys never reach the browser: audio is
 * sent to the backend and audio bytes come back base64-encoded.
 */
export const speechApi = {
  transcribe: (audio: string, languageCode?: string) =>
    api.post<TranscribeResult>('/api/speech/transcribe', { audio, languageCode }),
  synthesize: (text: string, languageCode?: string) =>
    api.post<SynthesizeResult>('/api/speech/synthesize', { text, languageCode }),
};

/**
 * Whether the server-side speech path is enabled. Feature-flagged via
 * `VITE_SERVER_SPEECH=true`; defaults to false so the browser Web Speech flow stays
 * the default and existing behaviour/tests are unaffected.
 */
export function serverSpeechEnabled(): boolean {
  return import.meta.env.VITE_SERVER_SPEECH === 'true';
}
