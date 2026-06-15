"use client";

// Shown when matchApi.send() returns 402. Two flavours:
//   - "paywall"  → free taster used up → subscribe (geo-priced)
//   - "quota"    → subscriber out of monthly messages → top-up
// On confirm, creates a Dodo checkout and redirects to it. Success/cancel return
// to the current page so the chat resumes after payment.

import { useState } from "react";
import { matchApi } from "@/lib/matchApi";

export function Paywall({
  reason,
  name,
  onClose,
}: {
  reason: "paywall" | "quota";
  name: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const kind = reason === "quota" ? "topup" : "subscription";

  async function go() {
    setLoading(true);
    setError(false);
    try {
      const here = typeof window !== "undefined" ? window.location.href : "";
      const { checkoutUrl } = await matchApi.checkout(kind, { successUrl: here, cancelUrl: here });
      if (checkoutUrl) window.location.href = checkoutUrl;
      else throw new Error("no checkout url");
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  const copy =
    reason === "quota"
      ? {
          emoji: "🔥",
          title: `you & ${name} have been talking a LOT`,
          body: "you've used your messages for this cycle. grab some more time together.",
          cta: "get more messages →",
        }
      : {
          emoji: "💘",
          title: `keep talking to ${name}`,
          body: "you've used your free messages. subscribe to keep the conversation going — unlimited, cancel anytime.",
          cta: "subscribe & continue →",
        };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm rounded-3xl border-[2.5px] border-ink bg-paper-cool p-6 text-center shadow-hard">
        <div className="text-4xl">{copy.emoji}</div>
        <h2 className="mt-2 font-sans text-xl font-bold tracking-tight text-ink">{copy.title}</h2>
        <p className="mt-2 font-display text-[14px] leading-relaxed text-ink-soft">{copy.body}</p>

        <button
          onClick={go}
          disabled={loading}
          className="mt-5 w-full rounded-xl border-2 border-ink bg-ink px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard disabled:opacity-60"
        >
          {loading ? "opening checkout…" : copy.cta}
        </button>
        {error && (
          <p className="mt-2 font-display text-[13px] text-red">couldn&apos;t start checkout — try again?</p>
        )}
        <button onClick={onClose} className="mt-3 font-display text-[13px] text-ink-mute underline">
          not now
        </button>
        <p className="mt-3 font-display text-[11px] text-ink-mute">cancel anytime · 7-day money-back</p>
      </div>
    </div>
  );
}
