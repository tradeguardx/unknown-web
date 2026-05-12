// Stranger-is-typing row. Renders inline within the thread (not a separate
// bubble) so the chat keeps its compact monospace layout. Three small dots
// pulsing in sequence — pure CSS via the .pulse-dot keyframe in globals.css.

export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 py-1 text-ink-mute font-mono text-[12.5px]"
      aria-label="Stranger is typing"
    >
      <span className="text-stranger font-semibold">stranger</span>
      <span className="inline-flex gap-[3px] ml-1">
        <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" />
        <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" style={{ animationDelay: "0.15s" }} />
        <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" style={{ animationDelay: "0.3s" }} />
      </span>
    </div>
  );
}
