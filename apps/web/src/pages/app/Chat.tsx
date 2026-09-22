import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Menu, MessageSquareText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { MessageDTO } from '@vaani/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StartScreen } from '@/features/chat/components/StartScreen';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { TypingIndicator } from '@/features/chat/components/TypingIndicator';
import { Composer } from '@/features/chat/components/Composer';
import { FeedbackPanel } from '@/features/chat/components/FeedbackPanel';
import { HistoryList } from '@/features/chat/components/HistoryList';
import { streamChatMessage } from '@/features/chat/chat.api';
import {
  invalidateHistory,
  useConversation,
  useFeedback,
  useStartConversation,
} from '@/features/chat/useChat';

function ChatRoom({ id }: { id: string }) {
  const { data, isLoading, isError } = useConversation(id);
  const feedback = useFeedback(id);

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const draftRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Seed / reset local message state whenever the loaded conversation changes.
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
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: userMessageId } : m)),
        );
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
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Chat history">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetTitle className="sr-only">Chat history</SheetTitle>
            <HistoryList activeId={id} onNavigate={() => setHistoryOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{conversation.title}</p>
        </div>
        <Badge variant="secondary">{conversation.level.replace('_', ' ').toLowerCase()}</Badge>
        <Button variant="outline" size="sm" onClick={openFeedback} disabled={!hasMessages}>
          <Sparkles className="h-4 w-4" /> Feedback
        </Button>
      </div>

      {/* Messages */}
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

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const startConversation = useStartConversation();

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px] gap-4">
      <aside className="hidden w-72 shrink-0 rounded-lg border bg-card lg:block">
        <HistoryList activeId={id} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {id ? (
          <ChatRoom key={id} id={id} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <StartScreen
              onStart={(topic, level) => startConversation.mutate({ topic, level })}
              isPending={startConversation.isPending}
            />
          </div>
        )}
      </section>
    </div>
  );
}
