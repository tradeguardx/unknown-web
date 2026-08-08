// Warm illustrated character faces for the AI Date roster. No stock photos, no
// clinical silhouettes — a friendly hand-drawn face on a soft gradient, keyed by
// the curated persona's avatarId (f1–f3 / m1–m3). Deterministic per id.

interface Props {
  avatarId: string;
  size?: number;
  className?: string;
}

// Soft skin + hair + backdrop palettes, chosen per avatar id so each character
// reads distinct at a glance.
const LOOKS: Record<string, { skin: string; hair: string; bg1: string; bg2: string; blush: string }> = {
  f1: { skin: "#f2c9a8", hair: "#3a2a20", bg1: "#ddccef", bg2: "#b89dd4", blush: "#f4a89e" },
  f2: { skin: "#e8b891", hair: "#1f1712", bg1: "#fae9a3", bg2: "#f5d967", blush: "#f4a89e" },
  f3: { skin: "#f4d3b6", hair: "#5a3826", bg1: "#f4a89e", bg2: "#e64a3a", blush: "#e64a3a" },
  m1: { skin: "#e3b58c", hair: "#221812", bg1: "#a7d3cc", bg2: "#5fa39a", blush: "#e8a58c" },
  m2: { skin: "#f0c6a0", hair: "#2a2018", bg1: "#c9d9ef", bg2: "#8ba9d4", blush: "#e8a58c" },
  m3: { skin: "#e6bd95", hair: "#3a281c", bg1: "#ddccef", bg2: "#b89dd4", blush: "#e8a58c" },
};

export function DateAvatar({ avatarId, size = 56, className = "" }: Props) {
  const look = LOOKS[avatarId] ?? LOOKS.f1;
  const isFem = avatarId.startsWith("f");
  const gid = `g-${avatarId}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={look.bg1} />
          <stop offset="1" stopColor={look.bg2} />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="18" fill={`url(#${gid})`} stroke="#1a1610" strokeWidth="2" />
      {/* hair back */}
      <path d="M14 34c0-12 8-20 18-20s18 8 18 20v6H14z" fill={look.hair} />
      {/* face */}
      <path d="M18 32c0-9 6-15 14-15s14 6 14 15c0 10-6 17-14 17s-14-7-14-17z" fill={look.skin} stroke="#1a1610" strokeWidth="1.5" />
      {/* fem hair sides */}
      {isFem && (
        <>
          <path d="M18 30c-2 6-2 14-1 20 3-2 4-8 4-14z" fill={look.hair} />
          <path d="M46 30c2 6 2 14 1 20-3-2-4-8-4-14z" fill={look.hair} />
        </>
      )}
      {/* hair top fringe */}
      <path d="M18 30c2-9 8-13 14-13s12 4 14 13c-4-4-8-5-14-5s-10 1-14 5z" fill={look.hair} />
      {/* eyes */}
      <circle cx="26" cy="32" r="1.7" fill="#1a1610" />
      <circle cx="38" cy="32" r="1.7" fill="#1a1610" />
      {/* blush */}
      <ellipse cx="24" cy="37" rx="2.6" ry="1.6" fill={look.blush} opacity="0.6" />
      <ellipse cx="40" cy="37" rx="2.6" ry="1.6" fill={look.blush} opacity="0.6" />
      {/* smile */}
      <path d="M27 39.5c1.5 1.7 3 2.4 5 2.4s3.5-.7 5-2.4" stroke="#1a1610" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
