export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2 text-stranger" aria-label="Stranger is typing">
      <Dot delay="0ms" />
      <Dot delay="150ms" />
      <Dot delay="300ms" />
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
