// The striped "photo" placeholder used across the date flow (matches the mockups:
// diagonal stripes in the character's colour, a small "photo" tag, and — on cards —
// a black archetype label pill). Stands in for real AI photos (added later).

interface Props {
  color: string; // stripe colour (persona.stripeColor) — fallback + tint
  photoUrl?: string; // real portrait; renders over the stripes when present
  alt?: string;
  variant?: "rect" | "portrait" | "square" | "circle";
  label?: string; // archetype pill, bottom-left (e.g. "the creative")
  showPhotoTag?: boolean;
  aiStamp?: boolean; // "✦ AI" disclosure on photoreal portraits
  className?: string;
  children?: React.ReactNode; // extra overlays (e.g. match %)
}

// A darker base tint so light stripe colours (yellow) still read on cream.
export function stripeStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: "#faf5e6",
    backgroundImage: `repeating-linear-gradient(-45deg, ${color} 0 14px, transparent 14px 28px)`,
  };
}

export function StripePhoto({ color, photoUrl, alt = "", variant = "rect", label, showPhotoTag = true, aiStamp = false, className = "", children }: Props) {
  const shape =
    variant === "circle" ? "rounded-full"
    : variant === "square" ? "rounded-2xl aspect-square"
    : variant === "portrait" ? "rounded-[10px] aspect-[4/5]"
    : "rounded-2xl aspect-[4/3]";
  return (
    <div className={`relative overflow-hidden border-2 border-ink ${shape} ${className}`} style={stripeStyle(color)}>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
      {children}
      {aiStamp && photoUrl && (
        <span className="absolute bottom-2 left-2 rounded-full border-[1.5px] border-ink bg-paper-cool/90 px-2 py-0.5 font-sans text-[10px] font-bold text-ink">✦ AI</span>
      )}
      {label && (
        <span className="absolute bottom-2 left-2 rounded-lg bg-ink px-2.5 py-1 font-sans text-[11px] font-bold text-paper-cool">
          {label}
        </span>
      )}
      {showPhotoTag && !photoUrl && (
        <span className="absolute bottom-2 right-2 rounded-full border-[1.5px] border-ink bg-paper-cool px-2 py-0.5 font-display text-[10px] italic text-ink">
          photo
        </span>
      )}
    </div>
  );
}
