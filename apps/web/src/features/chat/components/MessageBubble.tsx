import { Sparkles } from 'lucide-react';
import type { MessageRole } from '@vaani/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { initials } from '@/lib/format';

interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  children?: React.ReactNode;
}

/** A single chat message. AI messages show the Vaani avatar; user messages align right. */
export function MessageBubble({ role, content, children }: MessageBubbleProps) {
  const user = useAuthStore((s) => s.user);
  const isUser = role === 'USER';

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback>{initials(user?.name ?? 'U')}</AvatarFallback>
        </Avatar>
      ) : (
        <span className="vaani-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
          <Sparkles className="h-4 w-4" />
        </span>
      )}
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm bg-muted text-foreground',
        )}
      >
        {content}
        {children}
      </div>
    </div>
  );
}
