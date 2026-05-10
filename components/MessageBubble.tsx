interface Props {
  role: "user" | "assistant" | "system" | "warning";
  text: string;
}

export function MessageBubble({ role, text }: Props) {
  if (role === "warning") {
    return (
      <div className="my-2 mx-auto max-w-md text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        {text}
      </div>
    );
  }

  if (role === "system") {
    return (
      <div className="text-center text-xs text-neutral-400 my-2 italic">{text}</div>
    );
  }

  const isUser = role === "user";
  const label = isUser ? "You" : "Stranger";
  const labelColor = isUser ? "text-you" : "text-stranger";

  return (
    <div className="my-1 leading-relaxed">
      <span className={`font-semibold mr-2 ${labelColor}`}>{label}:</span>
      <span className="text-neutral-900 whitespace-pre-wrap break-words">{text}</span>
    </div>
  );
}
