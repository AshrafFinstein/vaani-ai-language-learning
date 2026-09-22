import { Link } from 'react-router-dom';
import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useChatHistory } from '../useChat';

interface HistoryListProps {
  activeId?: string;
  onNavigate?: () => void;
}

/** Conversation history list, shared by the desktop panel and the mobile drawer. */
export function HistoryList({ activeId, onNavigate }: HistoryListProps) {
  const { data, isLoading } = useChatHistory();
  const conversations = data?.conversations ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button asChild variant="gradient" className="w-full" onClick={onNavigate}>
          <Link to="/app/chat">
            <Plus className="h-4 w-4" /> New chat
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && (
          <div className="space-y-2 p-1">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No conversations yet. Start one above!
          </p>
        )}

        <ul className="space-y-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                to={`/app/chat/${c.id}`}
                onClick={onNavigate}
                className={cn(
                  'flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  c.id === activeId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title}</span>
                </span>
                {c.lastMessagePreview && (
                  <span className="truncate pl-5 text-xs text-muted-foreground">
                    {c.lastMessagePreview}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
