import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Scale, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { DebateMessageDTO } from '@vaani/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { TypingIndicator } from '@/features/chat/components/TypingIndicator';
import { Composer } from '@/features/chat/components/Composer';
import { DebateFeedbackPanel } from './DebateFeedbackPanel';
import { useDebate, useDebateFeedback, useDebateTurn } from './useDebate';

interface DebateRoomProps {
  id: string;
  headerLeft?: ReactNode;
}

/** The debate room: motion + side header, turn-by-turn arguments, and a scoring panel. */
export function DebateRoom({ id, headerLeft }: DebateRoomProps) {
  const { data, isLoading, isError } = useDebate(id);
  const turn = useDebateTurn(id);
  const feedback = useDebateFeedback(id);

  const [messages, setMessages] = useState<DebateMessageDTO[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(data?.debate.messages ?? []);
  }, [data?.debate.id, data?.debate.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, turn.isPending]);

  function handleSend(content: string) {
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'USER', content, createdAt: new Date().toISOString() },
    ]);
    turn.mutate(content, {
      onSuccess: (res) => {
        setMessages((prev) => [
          ...prev.map((m) => (m.id === tempId ? res.userMessage : m)),
          res.assistantMessage,
        ]);
      },
      onError: () => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error('Could not send your argument. Please try again.');
      },
    });
  }

  function openFeedback() {
    setFeedbackOpen(true);
    if (!feedback.data) feedback.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ml-auto h-16 w-1/2" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Couldn&apos;t load this debate.
      </div>
    );
  }

  const debate = data.debate;
  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        {headerLeft}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{debate.motion}</p>
          <p className="text-xs text-muted-foreground">
            You argue <span className="font-medium">{debate.userSide === 'FOR' ? 'for' : 'against'}</span>
          </p>
        </div>
        <Badge variant="secondary">{debate.level.replace('_', ' ').toLowerCase()}</Badge>
        <Button variant="outline" size="sm" onClick={openFeedback} disabled={!hasMessages}>
          <Trophy className="h-4 w-4" /> Score
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!hasMessages && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Scale className="h-8 w-8" />
            <p className="text-sm">Make your opening argument to begin!</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {turn.isPending && (
          <MessageBubble role="ASSISTANT" content="">
            <TypingIndicator />
          </MessageBubble>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer onSend={handleSend} disabled={turn.isPending} />

      <DebateFeedbackPanel
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        feedback={feedback.data?.feedback}
        isLoading={feedback.isPending}
      />
    </div>
  );
}
