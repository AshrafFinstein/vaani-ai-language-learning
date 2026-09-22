import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationView } from '@/features/chat/components/ConversationView';
import { CharacterPicker } from '@/features/characters/CharacterPicker';
import { useCharacters, useStartCharacterChat } from '@/features/characters/useCharacters';

function BackButton({ to }: { to: string }) {
  return (
    <Button asChild variant="ghost" size="icon" aria-label="Back to characters">
      <Link to={to}>
        <ArrowLeft className="h-5 w-5" />
      </Link>
    </Button>
  );
}

export default function CharactersPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useCharacters();
  const start = useStartCharacterChat();

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px]">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {id ? (
          <ConversationView key={id} id={id} headerLeft={<BackButton to="/app/characters" />} />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <CharacterPicker
              characters={data?.characters ?? []}
              isLoading={isLoading}
              isPending={start.isPending}
              onSelect={(characterKey, level) => start.mutate({ characterKey, level })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
