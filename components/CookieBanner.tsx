"use client";

// Light-touch local-storage notice. Doesn't gate any functionality (the data we
// store is "strictly necessary" — your form preferences — so technically GDPR
// allows it without explicit consent), but a visible disclosure is the cleaner
// posture for EU/UK traffic. Dismissed state itself is stored in localStorage.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const FLAG_KEY = "unknownchat:storageNotice:v1";

export function CookieBanner() {
  const pathname = usePathname();
  // Don't render anything during SSR — we don't know yet whether the user
  // has dismissed. Mounting on client avoids hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(FLAG_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(FLAG_KEY, "1"); } catch { /* ignore */ }
  }

  // Hide on /chat — the banner is fixed-positioned at the bottom of the
  // viewport and on mobile its element overlaps the chat input bar, which
  // captures taps and prevents the keyboard from opening. The user has also
  // already given implicit consent by accepting prefs to start a chat, so
  // the legal posture is fine without it on this surface.
  if (pathname?.startsWith("/chat")) return null;

  if (!mounted || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="storage notice"
      className="fixed bottom-3 right-3 left-3 sm:left-auto z-40 max-w-sm rounded-xl border border-neutral-200 bg-white shadow-lg p-4"
    >
      <p className="text-xs text-neutral-700 leading-relaxed">
        unknown.chat stores your preferences in your browser's local storage so the form
        remembers what you picked. We use our own privacy-friendly analytics for aggregate
        usage stats — no advertising, no third-party trackers.{" "}
        <Link href="/privacy" className="underline hover:text-neutral-900">read more</Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 w-full rounded-md bg-ink text-paper text-xs py-1.5 font-medium hover:opacity-90"
      >
        got it
      </button>
    </div>
  );
}
