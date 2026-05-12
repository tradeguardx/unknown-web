// Looking-for-stranger interstitial. Renders while the /chat session is being
// created and no opener has arrived. Pure visual — owns no state.
//
// Three positioned star-doodle SVGs frame the center text and pulsing dots.

interface Props {
  // Optional total-strangers-online line. Defaults to a static label if we
  // don't have a real number to show.
  onlineCount?: number;
}

export function LookingView({ onlineCount }: Props) {
  const label = typeof onlineCount === "number"
    ? `✦ ${onlineCount.toLocaleString()} strangers online ✦`
    : "✦ strangers online ✦";

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-5 relative">
      <Star className="absolute top-[25%] left-[18%] rotate-[15deg]" size={28} fill="#f5d967" />
      <Star className="absolute top-[30%] right-[15%] -rotate-[15deg]" size={22} fill="#b89dd4" />
      <Star className="absolute bottom-[30%] left-[12%] -rotate-[25deg]" size={24} fill="#e64a3a" />
      <Star className="absolute bottom-[25%] right-[18%] rotate-[10deg]" size={20} fill="#f5d967" />

      <p className="font-serif italic text-2xl text-ink-soft mb-5 leading-[1.25]">
        finding someone<br />awake…
      </p>

      <div className="flex gap-2 mb-6">
        <span className="w-[9px] h-[9px] bg-red rounded-full pulse-dot" style={{ animationDuration: "1.4s" }} />
        <span className="w-[9px] h-[9px] bg-red rounded-full pulse-dot" style={{ animationDuration: "1.4s", animationDelay: "0.2s" }} />
        <span className="w-[9px] h-[9px] bg-red rounded-full pulse-dot" style={{ animationDuration: "1.4s", animationDelay: "0.4s" }} />
      </div>

      <p className="font-display text-[17px] text-ink-mute">{label}</p>
    </div>
  );
}

function Star({ className, size, fill }: { className?: string; size: number; fill: string }) {
  return (
    <svg className={`pointer-events-none ${className ?? ""}`} width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M14 4 L16 12 L24 14 L16 16 L14 24 L12 16 L4 14 L12 12 Z"
        fill={fill}
        stroke="#1a1610"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
