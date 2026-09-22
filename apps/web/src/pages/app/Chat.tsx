import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { StartScreen } from '@/features/chat/components/StartScreen';
import { ConversationView } from '@/features/chat/components/ConversationView';
import { HistoryList } from '@/features/chat/components/HistoryList';
import { useStartConversation } from '@/features/chat/useChat';

/** Mobile history drawer trigger, shown in the conversation header on small screens. */
function MobileHistory({ activeId }: { activeId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Chat history">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetTitle className="sr-only">Chat history</SheetTitle>
        <HistoryList activeId={activeId} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const startConversation = useStartConversation('/app/chat');

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px] gap-4">
      <aside className="hidden w-72 shrink-0 rounded-lg border bg-card lg:block">
        <HistoryList activeId={id} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {id ? (
          <ConversationView key={id} id={id} headerLeft={<MobileHistory activeId={id} />} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <StartScreen
              onStart={(topic, level) => startConversation.mutate({ mode: 'CHAT', topic, level })}
              isPending={startConversation.isPending}
            />
          </div>
        )}
      </section>
    </div>
  );
}
