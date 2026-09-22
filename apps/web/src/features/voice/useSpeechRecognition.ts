import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typings for the non-standard Web Speech Recognition API (not in lib.dom).
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  0: RecognitionAlternative;
  isFinal: boolean;
  length: number;
}
interface RecognitionResultList {
  length: number;
  [index: number]: RecognitionResult;
}
interface RecognitionEvent {
  resultIndex: number;
  results: RecognitionResultList;
}
interface RecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => RecognitionInstance;

function getRecognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  /** Finalized transcript for the current utterance. */
  transcript: string;
  /** Live, not-yet-final words. */
  interim: string;
  error: string | null;
  start: (lang?: string) => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Browser speech-to-text via the Web Speech API. Degrades gracefully when unsupported
 * and surfaces permission/other errors (e.g. "not-allowed") to the caller.
 */
export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const ctorRef = useRef<RecognitionCtor | undefined>(getRecognitionCtor());
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const supported = Boolean(ctorRef.current);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  const start = useCallback(
    (lang = 'en-US') => {
      const Ctor = ctorRef.current;
      if (!Ctor) {
        setError('unsupported');
        return;
      }
      // Abort any prior instance before starting a fresh one.
      recognitionRef.current?.abort();
      setError(null);
      setInterim('');

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]!;
          const text = result[0].transcript;
          if (result.isFinal) finalText += text;
          else interimText += text;
        }
        if (finalText) setTranscript((prev) => (prev + ' ' + finalText).trim());
        setInterim(interimText);
      };
      recognition.onerror = (e) => setError(e.error);
      recognition.onend = () => {
        setListening(false);
        setInterim('');
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setListening(true);
      } catch {
        setError('start-failed');
      }
    },
    [],
  );

  // Clean up on unmount.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
