import { useState, type KeyboardEvent } from 'react';
import { Mic, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled }: ComposerProps) {
  const [value, setValue] = useState('');

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t bg-background p-3">
      {/* Voice input is wired in the Voice/Call phase. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title="Voice input arrives in a later phase"
        aria-label="Voice input (coming soon)"
      >
        <Mic className="h-5 w-5" />
      </Button>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type your message…"
        rows={1}
        className="max-h-40 flex-1 resize-none"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="gradient"
        size="icon"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <SendHorizonal className="h-5 w-5" />
      </Button>
    </div>
  );
}
