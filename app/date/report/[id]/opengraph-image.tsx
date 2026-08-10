// Shareable Dating-Report card as a PNG (Instagram-friendly 4:5). Renders the
// TEASER only — score, archetype, the date's verdict — so anyone can post it; the
// full report stays gated. Also used as the link-preview OG image.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1080, height: 1350 };
export const contentType = "image/png";
export const alt = "my Dating Report";

const MATCH_API = process.env.MATCH_API_URL || "https://api.unknown.chat/match";

export default async function Image({ params }: { params: { id: string } }) {
  let score = 0;
  let archetype = "The Mystery Date";
  let emoji = "💘";
  let tagline = "";
  let verdict = "";
  let personaName = "someone";
  try {
    const res = await fetch(`${MATCH_API}/results/${params.id}`, { cache: "no-store" });
    const j = await res.json();
    const data = j.data ?? j;
    const r = data.result ?? {};
    const meta = data.meta ?? {};
    score = r.overallScore ?? 0;
    archetype = r.archetype ?? archetype;
    emoji = r.archetypeEmoji ?? emoji;
    tagline = r.tagline ?? "";
    verdict = r.verdict?.line ?? "";
    personaName = meta.personaName ?? personaName;
  } catch {
    /* fall back to defaults */
  }

  const CREAM = "#f5eedb";
  const CARD = "#faf5e6";
  const INK = "#1a1610";
  const RED = "#e64a3a";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CREAM, padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30, fontWeight: 700, color: INK }}>
          <span>unknown<span style={{ color: RED }}>.</span>chat</span>
          <span style={{ fontSize: 24, color: "#807558" }}>a date with {personaName}</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 90 }}>{emoji}</div>
          <div style={{ display: "flex", alignItems: "baseline", color: RED, fontWeight: 800 }}>
            <span style={{ fontSize: 300, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 90 }}>/100</span>
          </div>
          <div style={{ fontSize: 60, fontWeight: 800, color: INK, marginTop: 8 }}>{archetype}</div>
          {tagline ? <div style={{ fontSize: 34, color: "#3d3826", marginTop: 12, maxWidth: 820 }}>{tagline}</div> : <div />}
        </div>

        {verdict ? (
          <div style={{ display: "flex", background: CARD, border: `4px solid ${INK}`, borderRadius: 24, padding: 32, fontSize: 34, fontStyle: "italic", color: INK }}>
            “{verdict}”
          </div>
        ) : <div />}

        <div style={{ marginTop: 28, fontSize: 26, color: "#807558", textAlign: "center", display: "flex", justifyContent: "center" }}>
          how good are you at dating? · unknown.chat/date
        </div>
      </div>
    ),
    { ...size },
  );
}
