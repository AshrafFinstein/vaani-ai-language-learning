import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MessageSquareText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { MessageDTO } from '@vaani/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Composer } from './Composer';
import { FeedbackPanel } from './FeedbackPanel';
import { streamChatMessage } from '../chat.api';
import { invalidateHistory, useConversation, useFeedback } from '../useChat';

interface ConversationViewProps {
  id: string;
  /** Optional slot on the left of the header (e.g. a back button or history trigger). */
  headerLeft?: ReactNode;
}

/**
 * The shared streaming conversation room used by Chat, Roleplay, and Dialogue modes.
 * Owns local message state, SSE streaming, the composer, and the feedback slide-over.
 */
export function ConversationView({ id, headerLeft }: ConversationViewProps) {
  const { data, isLoading, isError } = useConversation(id);
  const feedback = useFeedback(id);

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const draftRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(data?.conversation.messages ?? []);
    setAssistantDraft('');
    setIsStreaming(false);
  }, [data?.conversation.id, data?.conversation.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantDraft]);

  function handleSend(content: string) {
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'USER', content, createdAt: new Date().toISOString() },
    ]);
    setIsStreaming(true);
    setAssistantDraft('');
    draftRef.current = '';

    void streamChatMessage(id, content, {
      onMeta: ({ userMessageId }) => {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: userMessageId } : m)));
      },
      onDelta: (text) => {
        draftRef.current += text;
        setAssistantDraft(draftRef.current);
      },
      onDone: (assistantMessageId) => {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'ASSISTANT',
            content: draftRef.current,
            createdAt: new Date().toISOString(),
          },
        ]);
        setAssistantDraft('');
        setIsStreaming(false);
        invalidateHistory();
      },
      onError: (message) => {
        setIsStreaming(false);
        setAssistantDraft('');
        toast.error(message);
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
        Couldn&apos;t load this conversation.
      </div>
    );
  }

  const conversation = data.conversation;
  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        {headerLeft}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{conversation.title}</p>
        </div>
        <Badge variant="secondary">{conversation.level.replace('_', ' ').toLowerCase()}</Badge>
        <Button variant="outline" size="sm" onClick={openFeedback} disabled={!hasMessages}>
          <Sparkles className="h-4 w-4" /> Feedback
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!hasMessages && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageSquareText className="h-8 w-8" />
            <p className="text-sm">Say hello to start practicing!</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {isStreaming && (
          <MessageBubble role="ASSISTANT" content={assistantDraft}>
            {!assistantDraft && <TypingIndicator />}
          </MessageBubble>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer onSend={handleSend} disabled={isStreaming} />

      <FeedbackPanel
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        feedback={feedback.data?.feedback}
        isLoading={feedback.isPending}
      />
    </div>
  );
}
