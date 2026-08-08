// The visual environment for a date. A soft full-bleed gradient per scene theme
// plus a light atmospheric touch (snow / rain / glow) so the chat feels like it's
// happening somewhere. Purely decorative; sits behind the chat with low opacity so
// text stays readable on the paper base.

interface Props {
  theme: string;
  className?: string;
}

const THEMES: Record<string, { from: string; via: string; to: string; fx?: "snow" | "rain" | "sun" | "city" }> = {
  warm_coffee_shop: { from: "#f4d3b6", via: "#e8c49a", to: "#c9a97f", fx: "snow" },
  city_rooftop_night: { from: "#3a3350", via: "#5a4d78", to: "#b89dd4", fx: "city" },
  beach_sunset: { from: "#f5d967", via: "#f4a89e", to: "#e64a3a", fx: "sun" },
  cozy_bookstore: { from: "#e3d4b0", via: "#cbb98a", to: "#a7947f", fx: "rain" },
};

export function SceneBackdrop({ theme, className = "" }: Props) {
  const t = THEMES[theme] ?? { from: "#faf5e6", via: "#ebe2c4", to: "#ddccef" };
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ background: `linear-gradient(160deg, ${t.from} 0%, ${t.via} 45%, ${t.to} 100%)` }}
    >
      {t.fx === "snow" && (
        <div className="absolute inset-0 opacity-70">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                left: `${(i * 53) % 100}%`,
                top: `${(i * 31) % 100}%`,
                opacity: 0.5 + (i % 3) * 0.15,
              }}
            />
          ))}
        </div>
      )}
      {t.fx === "rain" && (
        <div className="absolute inset-0 opacity-40">
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              className="absolute bg-ink/30"
              style={{ width: 1, height: 10 + (i % 4) * 4, left: `${(i * 47) % 100}%`, top: `${(i * 37) % 100}%`, transform: "rotate(12deg)" }}
            />
          ))}
        </div>
      )}
      {t.fx === "sun" && (
        <div className="absolute -top-10 right-6 h-40 w-40 rounded-full bg-yellow/60 blur-2xl" />
      )}
      {t.fx === "city" && (
        <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50">
          {Array.from({ length: 26 }).map((_, i) => (
            <span
              key={i}
              className="absolute bottom-0 bg-yellow/70"
              style={{ width: 1.5, height: 2 + ((i * 7) % 9), left: `${(i * 3.8) % 100}%`, opacity: 0.6 }}
            />
          ))}
        </div>
      )}
      {/* soften into the paper base so chat text stays legible */}
      <div className="absolute inset-0 bg-paper-cool/45" />
    </div>
  );
}
