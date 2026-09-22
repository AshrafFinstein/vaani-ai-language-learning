import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechSynthesisResult {
  supported: boolean;
  speaking: boolean;
  speak: (text: string, lang?: string, onEnd?: () => void) => void;
  cancel: () => void;
}

/** Browser text-to-speech via the Web Speech API (SpeechSynthesis). */
export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  const endCbRef = useRef<(() => void) | undefined>(undefined);

  const speak = useCallback(
    (text: string, lang = 'en-US', onEnd?: () => void) => {
      if (!supported || !text.trim()) {
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
    [supported],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  // Stop any speech if the component unmounts.
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
