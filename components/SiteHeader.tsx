"use client";

// Top navigation bar for non-chat pages (about / terms / privacy). Matches
// the landing header — wordmark + menu hamburger that opens the MenuDrawer.
//
// The inline link row (home/about/terms/privacy) is gone — those live in the
// drawer now, where they don't compete with the page's actual content.

import Link from "next/link";
import { useState } from "react";
import { MenuDrawer } from "./landing/MenuDrawer";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="px-5 lg:px-8 pt-4 lg:pt-6 pb-3 max-w-md lg:max-w-3xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          aria-label="unknown.chat home"
          className="wordmark-underline font-sans font-bold text-base lg:text-lg tracking-[-0.025em] text-ink inline-flex items-baseline relative no-underline"
        >
          unknown
          <span className="text-red text-[19px] lg:text-[22px] -translate-y-[2px]">.</span>
          chat
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-1 text-ink-soft hover:text-ink"
          aria-label="menu"
        >
          <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h14M3 10h14M3 14h14" />
          </svg>
        </button>
      </header>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
