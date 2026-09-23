import { useCallback, useEffect, useRef, useState } from 'react';
import { serverSpeechEnabled, speechApi } from './speech.api';

export interface UseSpeechSynthesisResult {
  supported: boolean;
  speaking: boolean;
  speak: (text: string, lang?: string, onEnd?: () => void) => void;
  cancel: () => void;
}

/**
 * Text-to-speech for the Call page.
 *
 * Default/offline path: the browser Web Speech API (SpeechSynthesis) — unchanged, so
 * existing behaviour and tests are unaffected. When the server-speech capability flag
 * (`VITE_SERVER_SPEECH=true`) is set, `speak` first tries server TTS (real audio synthesized
 * by the backend provider abstraction; keys stay on the backend) and falls back to the
 * browser path on any failure or when audio can't play.
 */
export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const browserSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const useServer = serverSpeechEnabled();
  const supported = browserSupported || useServer;

  const [speaking, setSpeaking] = useState(false);
  const endCbRef = useRef<(() => void) | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakBrowser = useCallback(
    (text: string, lang: string, onEnd?: () => void) => {
      if (!browserSupported || !text.trim()) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      endCbRef.current = onEnd;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        endCbRef.current?.();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        endCbRef.current?.();
      };
      window.speechSynthesis.speak(utterance);
    },
    [browserSupported],
  );

  const speak = useCallback(
    (text: string, lang = 'en-US', onEnd?: () => void) => {
      if (!text.trim()) {
        onEnd?.();
        return;
      }
      if (!useServer) {
        speakBrowser(text, lang, onEnd);
        return;
      }
      // Server TTS path (feature-flagged). Fall back to the browser on any failure.
      const langCode = lang.split('-')[0];
      setSpeaking(true);
      speechApi
        .synthesize(text, langCode)
        .then(({ audio, mimeType }) => {
          const el = new Audio(`data:${mimeType};base64,${audio}`);
          audioRef.current = el;
          el.onended = () => {
            setSpeaking(false);
            onEnd?.();
          };
          el.onerror = () => {
            setSpeaking(false);
            speakBrowser(text, lang, onEnd);
          };
          void el.play().catch(() => {
            setSpeaking(false);
            speakBrowser(text, lang, onEnd);
          });
        })
        .catch(() => {
          setSpeaking(false);
          speakBrowser(text, lang, onEnd);
        });
    },
    [useServer, speakBrowser],
  );

  const cancel = useCallback(() => {
    if (browserSupported) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, [browserSupported]);

  // Stop any speech if the component unmounts.
  useEffect(
    () => () => {
      if (browserSupported) window.speechSynthesis.cancel();
      audioRef.current?.pause();
    },
    [browserSupported],
  );

  return { supported, speaking, speak, cancel };
}
