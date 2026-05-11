import { ImageResponse } from "next/og";

// Default Open Graph image for unknown.chat — auto-served at /opengraph-image.
// Next.js picks this up automatically and adds it to the OG meta tags.
// Generated server-side at build/request time, no static asset to maintain.

export const alt = "unknown.chat — talk to a stranger";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0b0b0d",
          color: "#fafaf7",
          padding: "80px",
        }}
      >
        <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
          unknown.chat
        </div>
        <div style={{ marginTop: 32, fontSize: 44, color: "#a3a3a3", textAlign: "center" }}>
          talk to someone you'll never meet again.
        </div>
        <div style={{ marginTop: 60, fontSize: 24, color: "#737373" }}>
          anonymous · no accounts · no memory
        </div>
      </div>
    ),
    { ...size },
  );
}
