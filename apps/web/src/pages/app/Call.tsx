import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Phone, PhoneOff, ScrollText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useLanguages } from '@/features/language/useLanguages';
import { chatApi } from '@/features/chat/chat.api';
import { useSpeechRecognition } from '@/features/voice/useSpeechRecognition';
import { useSpeechSynthesis } from '@/features/voice/useSpeechSynthesis';
import { toBcp47 } from '@/features/voice/lang';

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended';
interface Turn {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CallPage() {
  const user = useAuthStore((s) => s.user);
  const { data: languages } = useLanguages();
  const language = languages?.find((l) => l.code === user?.learningLanguageCode);
  const bcp47 = toBcp47(user?.learningLanguageCode);

  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const [status, setStatus] = useState<CallStatus>('idle');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const processingRef = useRef(false);
  const mutedRef = useRef(false);
  const statusRef = useRef<CallStatus>('idle');
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Call timer.
  useEffect(() => {
    if (status !== 'active') return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const handleUtterance = useCallback(
    async (text: string) => {
      if (!conversationId) return;
      stt.reset();
      setTurns((prev) => [...prev, { role: 'USER', content: text }]);
      setThinking(true);
      try {
        const res = await chatApi.send(conversationId, { content: text });
        const reply = res.assistantMessage.content;
        setTurns((prev) => [...prev, { role: 'ASSISTANT', content: reply }]);
        setThinking(false);
        processingRef.current = false;
        tts.speak(reply, bcp47, () => {
          if (statusRef.current === 'active' && !mutedRef.current) stt.start(bcp47);
        });
      } catch {
        setThinking(false);
        processingRef.current = false;
        toast.error('Something went wrong. Try speaking again.');
      }
    },
    [conversationId, bcp47, stt, tts],
  );

  // When the mic finishes an utterance, send it to the AI.
  useEffect(() => {
    if (status !== 'active' || stt.listening || thinking || tts.speaking || muted) return;
    const text = stt.transcript.trim();
    if (!text || processingRef.current) return;
    processingRef.current = true;
    void handleUtterance(text);
  }, [status, stt.listening, stt.transcript, thinking, tts.speaking, muted, handleUtterance]);

  async function startCall() {
    setStatus('connecting');
    try {
      const { conversation } = await chatApi.start({
        mode: 'CHAT',
        topic: 'FREE',
        level: user?.level ?? 'BEGINNER',
      });
      setConversationId(conversation.id);
      setSeconds(0);
      setTurns([]);
      setStatus('active');
      const greeting = "Hi! I'm Vaani. Let's have a chat — how are you today?";
      setTurns([{ role: 'ASSISTANT', content: greeting }]);
      tts.speak(greeting, bcp47, () => {
        if (!mutedRef.current) stt.start(bcp47);
      });
    } catch {
      toast.error('Could not start the call.');
      setStatus('idle');
    }
  }

  function endCall() {
    tts.cancel();
    stt.stop();
    processingRef.current = false;
    setStatus('ended');
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (next) stt.stop();
      else if (statusRef.current === 'active' && !tts.speaking && !thinking) stt.start(bcp47);
      return next;
    });
  }

  if (!stt.supported) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <MicOff className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">Voice isn&apos;t supported here</p>
            <p className="text-sm text-muted-foreground">
              Your browser doesn&apos;t support speech recognition. Try Chrome on desktop or Android
              to use Call mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabel = thinking
    ? 'Thinking…'
    : tts.speaking
      ? 'Speaking…'
      : stt.listening
        ? 'Listening…'
        : muted
          ? 'Muted'
          : 'Ready';

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-8 py-8 animate-fade-in">
      {/* AI avatar */}
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            'vaani-gradient flex h-32 w-32 items-center justify-center rounded-full text-white shadow-lg transition-transform',
            tts.speaking && 'animate-pulse scale-105',
            stt.listening && 'ring-4 ring-primary/40 ring-offset-2 ring-offset-background',
          )}
        >
          <Sparkles className="h-12 w-12" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold">Vaani</p>
          <p className="text-sm text-muted-foreground">
            {language ? `${language.flagEmoji} ${language.name} call` : 'Voice call'}
          </p>
        </div>
      </div>

      {status === 'active' && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold tabular-nums">{formatTime(seconds)}</span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {thinking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {statusLabel}
          </span>
          {stt.interim && (
            <p className="mt-1 max-w-xs text-center text-sm italic text-muted-foreground">
              {stt.interim}
            </p>
          )}
        </div>
      )}

      {stt.error === 'not-allowed' && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          Microphone access was denied. Please allow it in your browser settings.
        </div>
      )}

      {/* Controls */}
      {status === 'idle' && (
        <Button variant="gradient" size="lg" onClick={startCall}>
          <Phone className="h-5 w-5" /> Start call
        </Button>
      )}

      {status === 'connecting' && (
        <Button variant="gradient" size="lg" disabled>
          <Loader2 className="h-5 w-5 animate-spin" /> Connecting…
        </Button>
      )}

      {status === 'active' && (
        <div className="flex items-center gap-4">
          <Button
            variant={muted ? 'secondary' : 'outline'}
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={endCall}
            aria-label="End call"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={() => setShowTranscript((v) => !v)}
            aria-label="Toggle transcript"
          >
            <ScrollText className="h-6 w-6" />
          </Button>
        </div>
      )}

      {status === 'ended' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Call ended · {formatTime(seconds)}</p>
          <div className="flex gap-2">
            <Button variant="gradient" onClick={startCall}>
              <Phone className="h-4 w-4" /> New call
            </Button>
            <Button variant="outline" onClick={() => setShowTranscript((v) => !v)}>
              <ScrollText className="h-4 w-4" /> Transcript
            </Button>
          </div>
        </div>
      )}

      {/* Transcript */}
      {showTranscript && turns.length > 0 && (
        <Card className="w-full">
          <CardContent className="max-h-64 space-y-2 overflow-y-auto p-4 text-sm">
            {turns.map((t, i) => (
              <p key={i} className={cn(t.role === 'USER' ? 'text-right' : 'text-left')}>
                <span className="font-medium">{t.role === 'USER' ? 'You: ' : 'Vaani: '}</span>
                {t.content}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
