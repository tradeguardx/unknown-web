import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Custom 404 — Next.js serves this for any unmatched route.
// Important for SEO + UX: a generic-looking 404 makes the whole site feel
// broken when a crawler / visitor hits a stale URL. This one keeps them on
// the site with helpful internal links + maintains brand vibe.
//
// noindex via robots so 404 pages don't accidentally rank.

export const metadata: Metadata = {
  title: "lost in the dark — page not found",
  description: "That page isn't here. Either it never was, or it ghosted. Tap below to find someone awake instead.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="max-w-md">
          <p className="font-display text-lg text-red font-semibold -rotate-2 mb-3">
            ↙ wrong room
          </p>
          <h1 className="font-sans font-bold text-6xl lg:text-7xl tracking-[-0.05em] text-ink leading-none mb-4">
            404
          </h1>
          <p className="font-serif italic text-2xl text-ink-soft mb-2">
            this page <em>ghosted</em>.
          </p>
          <p className="font-display text-base text-ink-mute mb-7">
            either it never existed, or it left without a goodbye.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-red text-paper-cool border-2 border-ink rounded-2xl px-6 py-3 font-sans text-base font-bold tracking-tight shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all"
          >
            find someone awake
            <span aria-hidden>→</span>
          </Link>

          <div className="mt-10 font-display text-base text-ink-mute">
            or read{" "}
            <Link href="/about" className="text-red underline font-semibold">about</Link>{" "}
            ·{" "}
            <Link href="/faq" className="text-red underline font-semibold">faq</Link>{" "}
            ·{" "}
            <Link href="/privacy" className="text-red underline font-semibold">privacy</Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
