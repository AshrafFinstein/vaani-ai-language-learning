import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { DIALOGUE_SCENARIOS } from '@vaani/types';
import { Button } from '@/components/ui/button';
import { ScenarioPicker } from '@/features/practice/ScenarioPicker';
import { ConversationView } from '@/features/chat/components/ConversationView';
import { useStartConversation } from '@/features/chat/useChat';

function BackButton({ to }: { to: string }) {
  return (
    <Button asChild variant="ghost" size="icon" aria-label="Back to dialogues">
      <Link to={to}>
        <ArrowLeft className="h-5 w-5" />
      </Link>
    </Button>
  );
}

export default function DialoguePage() {
  const { id } = useParams<{ id: string }>();
  const start = useStartConversation('/app/dialogue');

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px]">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {id ? (
          <ConversationView key={id} id={id} headerLeft={<BackButton to="/app/dialogue" />} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <ScenarioPicker
              icon={MessageCircle}
              title="Dialogue"
              subtitle="Follow a short, guided conversation to a goal."
              items={DIALOGUE_SCENARIOS.map((s) => ({
                key: s.key,
                title: s.title,
                description: s.description,
                badge: s.goal,
              }))}
              isPending={start.isPending}
              onSelect={(scenarioKey, level) => start.mutate({ mode: 'DIALOGUE', scenarioKey, level })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
