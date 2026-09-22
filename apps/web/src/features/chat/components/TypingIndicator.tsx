/** Three bouncing dots shown while the AI reply is being generated. */
export function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Vaani is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
