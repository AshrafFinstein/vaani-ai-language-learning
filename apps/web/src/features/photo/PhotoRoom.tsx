import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { PhotoMessageDTO } from '@vaani/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { TypingIndicator } from '@/features/chat/components/TypingIndicator';
import { Composer } from '@/features/chat/components/Composer';
import { usePhotoReply, usePhotoSession } from './usePhoto';

interface PhotoRoomProps {
  id: string;
  headerLeft?: ReactNode;
}

/** Conversation room for Photo mode: shows the image and chats about it (mock vision). */
export function PhotoRoom({ id, headerLeft }: PhotoRoomProps) {
  const { data, isLoading, isError } = usePhotoSession(id);
  const reply = usePhotoReply(id);

  const [messages, setMessages] = useState<PhotoMessageDTO[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(data?.session.messages ?? []);
  }, [data?.session.id, data?.session.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, reply.isPending]);

  function handleSend(content: string) {
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'USER', content, createdAt: new Date().toISOString() },
    ]);
    reply.mutate(content, {
      onSuccess: (res) => {
        setMessages((prev) => [
          ...prev.map((m) => (m.id === tempId ? res.userMessage : m)),
          res.assistantMessage,
        ]);
      },
      onError: () => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error('Could not send your message. Please try again.');
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-16 w-2/3" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Couldn&apos;t load this photo conversation.
      </div>
    );
  }

  const session = data.session;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        {headerLeft}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">Photo conversation</p>
        </div>
        <Badge variant="secondary">{session.level.replace('_', ' ').toLowerCase()}</Badge>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="overflow-hidden rounded-xl border">
          <img
            src={session.imageUrl}
            alt="The photo being discussed"
            className="max-h-64 w-full object-contain"
          />
        </div>
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {reply.isPending && (
          <MessageBubble role="ASSISTANT" content="">
            <TypingIndicator />
          </MessageBubble>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer onSend={handleSend} disabled={reply.isPending} />
    </div>
  );
}
