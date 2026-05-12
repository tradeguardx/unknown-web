// Message rendering for the chat thread.
//
// Four roles:
//   - "user"      → "you: …" in green
//   - "assistant" → "str: …" in blue (abbreviated label is a design choice)
//   - "system"    → centered italic serif line (connect/disconnect notices)
//   - "warning"   → amber paper card (content-filter warning before close)
//
// The new design uses monospaced text in the chat body, not bubbles. Hierarchy
// comes from the role label color, not from background fill.

interface Props {
  role: "user" | "assistant" | "system" | "warning";
  text: string;
}

export function MessageBubble({ role, text }: Props) {
  if (role === "warning") {
    return (
      <div className="my-2 mx-auto max-w-md text-center text-[12px] text-ink-soft bg-yellow-soft border-[1.5px] border-ink rounded-lg px-3 py-2 font-display font-bold shadow-hard-xs">
        {text}
      </div>
    );
  }

  if (role === "system") {
    return (
      <div className="text-center text-ink-mute italic text-xs font-serif py-2">
        {text}
      </div>
    );
  }

  const isUser = role === "user";
  const label = isUser ? "you" : "str";
  const labelColor = isUser ? "text-you" : "text-stranger";

  return (
    <div className="mb-1.5 font-mono text-[13.5px] leading-[1.7] break-words">
      <span className={`font-semibold mr-1.5 ${labelColor}`}>{label}:</span>
      <span className="text-ink whitespace-pre-wrap">{text}</span>
    </div>
  );
}
