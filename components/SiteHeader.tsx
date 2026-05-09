// Top navigation bar shown on landing + info pages (about/terms/privacy).
// Not rendered on /chat — that page is a focused interactive surface, intentionally chrome-free.

import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" aria-label="unknown.chat home" className="hover:opacity-80 transition-opacity">
          <Logo size="sm" />
        </Link>
        <div className="flex gap-4 text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-900">home</Link>
          <Link href="/about" className="hover:text-neutral-900">about</Link>
          <Link href="/terms" className="hover:text-neutral-900">terms</Link>
          <Link href="/privacy" className="hover:text-neutral-900">privacy</Link>
        </div>
      </nav>
    </header>
  );
}
