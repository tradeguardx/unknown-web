"use client";

// Top-level React error boundary. Catches render-time crashes anywhere in the
// app, reports them to Sentry, and shows a calm fallback instead of a white
// screen. (Next.js requires global-error to render its own <html>/<body>.)
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#fafaf7",
          color: "#1a1a1a",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😵‍💫</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            something glitched
          </h1>
          <p style={{ fontSize: 14, color: "#666", margin: "0 0 20px" }}>
            that&apos;s on us, not you. try again in a sec.
          </p>
          <button
            onClick={() => reset()}
            style={{
              border: "2px solid #1a1a1a",
              background: "#e64a3a",
              color: "#fafaf7",
              borderRadius: 12,
              padding: "10px 20px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            try again
          </button>
        </div>
      </body>
    </html>
  );
}
