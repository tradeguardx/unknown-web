"use client";

// Slim promo strip shown ONLY on the homepage and pricing page. Announces the
// FUN10 offer (10% off Unknown+ monthly, auto-applied at checkout) with a live
// countdown. The deadline is the visitor's LOCAL end-of-day, so the time left
// naturally varies country-to-country (timezone) and the daily offer resets at
// each locale's midnight — always a ≤24h window, always live.

import { useEffect, useState } from "react";
import Link from "next/link";

function msToNextLocalMidnight(): number {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0); // next local midnight in the visitor's timezone
  return end.getTime() - now.getTime();
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function OfferBar() {
  // null until mounted → avoids an SSR/CSR hydration mismatch on the timer.
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLeft(fmt(msToNextLocalMidnight()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link
      href="/plus"
      className="block border-b-2 border-ink bg-red text-paper-cool"
      aria-label="Offer: 10% off Unknown+ monthly with code FUN10"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-3 py-2 text-center">
        <span className="font-sans text-[12px] font-bold sm:text-[13px]">
          🎉 10% off <span className="hidden sm:inline">Unknown+ </span>monthly with code
        </span>
        <span className="rounded-md border border-paper-cool/70 bg-paper-cool px-1.5 py-0.5 font-mono text-[12px] font-bold tracking-wider text-red">
          FUN10
        </span>
        <span className="font-display italic text-[12px] text-paper-cool/85">
          ends in{" "}
          <span className="font-mono not-italic tabular-nums" suppressHydrationWarning>
            {left ?? "24:00:00"}
          </span>
        </span>
        <span className="font-sans text-[12px] font-bold underline underline-offset-2">
          claim →
        </span>
      </div>
    </Link>
  );
}
