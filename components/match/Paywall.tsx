"use client";

// Shown when matchApi.send() returns 402. Two flavours:
//   - "paywall"  → free taster used up → subscribe (geo-priced)
//   - "quota"    → subscriber out of monthly messages → top-up
// On confirm, creates a Dodo checkout and redirects to it. Success/cancel return
// to the current page so the chat resumes after payment.

import { useEffect, useState } from "react";
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
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const kind = reason === "quota" ? "topup" : "subscription";

  // Fetch the geo-resolved price for display ($2.99 / $4.99 by country).
  useEffect(() => {
    if (reason !== "paywall") return;
    let alive = true;
    matchApi
      .pricing()
      .then((p) => alive && setPriceLabel(p.subscription.label))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [reason]);

  async function go() {
    const here = typeof window !== "undefined" ? window.location.href : "";
    // Free-taster paywall → the full unknown+ page (price, features, login),
    // carrying this chat's URL so Dodo returns here and the conversation resumes.
    if (reason === "paywall") {
      window.location.href = `/plus?return=${encodeURIComponent(here)}`;
      return;
    }
    // Quota top-up → straight to checkout (no /plus page for top-ups).
    setLoading(true);
    setError(false);
    try {
      const { checkoutUrl } = await matchApi.checkout(kind, { successUrl: here, cancelUrl: here });
      if (checkoutUrl) window.location.href = checkoutUrl;
      else throw new Error("no checkout url");
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  // Quota top-up (subscriber out of messages) — single CTA, straight to checkout.
  if (reason === "quota") {
    return (
      <Sheet onClose={onClose}>
        <div className="text-4xl">🔥</div>
        <h2 className="mt-2 font-sans text-xl font-bold tracking-tight text-ink">
          you &amp; {name} have been talking a LOT
        </h2>
        <p className="mt-2 font-display text-[14px] leading-relaxed text-ink-soft">
          you&apos;ve used your messages for this cycle. grab some more time together.
        </p>
        <button
          onClick={go}
          disabled={loading}
          className="mt-5 w-full rounded-xl border-2 border-ink bg-ink px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard disabled:opacity-60"
        >
          {loading ? "opening checkout…" : "get more messages →"}
        </button>
        {error && <p className="mt-2 font-display text-[13px] text-red">couldn&apos;t start — try again?</p>}
        <DismissRow onClose={onClose} />
      </Sheet>
    );
  }

  // Free taster used up → lead with the cheap $1 day pass, subscription secondary.
  return (
    <Sheet onClose={onClose}>
      <div className="text-4xl">💘</div>
      <h2 className="mt-2 font-sans text-xl font-bold tracking-tight text-ink">keep talking to {name}</h2>
      <p className="mt-2 font-display text-[14px] leading-relaxed text-ink-soft">
        your free chat with {name} is up — unlock more 👇
      </p>

      <button
        onClick={go}
        className="mt-5 w-full rounded-xl border-2 border-ink bg-ink px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard"
      >
        🎟️ day pass · $1 →
      </button>
      <p className="mt-1 font-display text-[12px] text-ink-mute">unlimited conversations for the next 24 hours · one-time</p>

      <button
        onClick={go}
        className="mt-3 w-full rounded-xl border-2 border-ink bg-paper-cool px-5 py-2.5 font-sans text-[14px] font-bold tracking-tight text-ink shadow-hard-xs"
      >
        or go unlimited{priceLabel ? ` · ${priceLabel}/mo` : ""} →
      </button>

      <DismissRow onClose={onClose} />
    </Sheet>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 px-4 pb-6 sm:pb-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border-[2.5px] border-ink bg-paper-cool p-6 text-center shadow-hard"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function DismissRow({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button onClick={onClose} className="mt-3 font-display text-[13px] text-ink-mute underline">
        not now
      </button>
      <p className="mt-3 font-display text-[11px] text-ink-mute">instant access · secure checkout</p>
    </>
  );
}
