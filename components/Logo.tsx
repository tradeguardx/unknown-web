// Textual logo. Three pieces: "unknown" (regular), the dot (dimmed),
// "chat" (bold), and a terminal-style blinking cursor block. Same design
// at every size — just scales via the `size` prop.

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES: Record<NonNullable<Props["size"]>, { text: string; cursor: string }> = {
  sm: { text: "text-sm", cursor: "w-[6px] h-[14px] ml-[3px]" },
  md: { text: "text-2xl", cursor: "w-[10px] h-[24px] ml-[4px]" },
  lg: { text: "text-4xl", cursor: "w-[14px] h-[34px] ml-[6px]" },
};

export function Logo({ size = "sm", className = "" }: Props) {
  const s = SIZES[size];
  return (
    <span
      className={`inline-flex items-center font-mono tracking-tight ${s.text} ${className}`}
      aria-label="unknown.chat"
    >
      <span className="font-normal text-neutral-900">unknown</span>
      <span className="text-neutral-400">.</span>
      <span className="font-bold text-neutral-900">chat</span>
      <span
        className={`inline-block bg-neutral-900 logo-cursor ${s.cursor}`}
        aria-hidden
      />
    </span>
  );
}
