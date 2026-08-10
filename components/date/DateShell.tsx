"use client";

// The light-screen frame for the date picker steps. Uses the SAME header as the
// homepage (wordmark → home, hamburger → menu drawer) so the date feels part of
// the site, with a contextual step pill + "leave" on the right. Body scrolls;
// dark date screens use their own frame.

import Link from "next/link";
import { useState } from "react";
import { MenuDrawer } from "@/components/landing/MenuDrawer";

interface Props {
  step?: string; // right-side pill text e.g. "step 1 of 3 — pick your date"
  leftChip?: React.ReactNode; // e.g. the "maya · change" chip on the scene step
  onLeave?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode; // sticky footer (the CTA row)
}

function Wordmark() {
  return (
    <Link
      href="/"
      className="wordmark-underline font-sans font-bold text-base lg:text-lg tracking-[-0.025em] inline-flex items-baseline relative no-underline"
    >
      unknown<span className="text-red text-[19px] lg:text-[22px] -translate-y-[2px]">.</span>chat
    </Link>
  );
}

export function DateShell({ step, leftChip, onLeave, children, footer }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="w-full p-2 sm:p-4 lg:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col rounded-2xl sm:rounded-3xl border border-ink/10 bg-paper-cool min-h-[calc(100dvh-1rem)] sm:min-h-[calc(100dvh-2rem)] lg:min-h-[calc(100dvh-3rem)]">
        {/* header — matches the homepage; sticks while the page scrolls */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 rounded-t-2xl sm:rounded-t-3xl border-b border-ink/10 bg-paper-cool px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <Wordmark />
            {leftChip}
          </div>
          <div className="flex items-center gap-2">
            {step && (
              <span className="hidden sm:inline rounded-full border-[1.5px] border-ink bg-yellow px-3 py-1 font-sans text-[12px] font-bold text-ink">
                {step}
              </span>
            )}
            {onLeave && (
              <button
                onClick={onLeave}
                className="rounded-full border-[1.5px] border-ink bg-paper px-3 py-1 font-sans text-[12px] font-bold text-ink hover:bg-paper-deep"
              >
                ✕ leave
              </button>
            )}
            <button onClick={() => setMenuOpen(true)} className="p-1 text-ink-soft hover:text-ink" aria-label="menu">
              <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h14M3 10h14M3 14h14" />
              </svg>
            </button>
          </div>
        </header>

        {/* mobile step label (the pill is hidden on small screens) */}
        {step && (
          <div className="sm:hidden border-b border-ink/10 bg-yellow/50 px-4 py-1.5 font-sans text-[11px] font-bold text-ink text-center">
            {step}
          </div>
        )}

        {/* body — grows with content; the page (main) scroller handles overflow */}
        <div className="flex-1 px-4 py-5 sm:px-8 sm:py-7">{children}</div>

        {/* footer — sticks to the viewport bottom so the CTA stays reachable */}
        {footer && (
          <div className="sticky bottom-0 z-20 rounded-b-2xl sm:rounded-b-3xl border-t border-ink/10 bg-paper-cool px-4 py-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

export { Wordmark as DateWordmark };
