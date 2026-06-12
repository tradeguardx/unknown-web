import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";
import { PlusBetaForm } from "@/components/landing/PlusBetaForm";

export const metadata: Metadata = {
  title: { absolute: "unknown+ — coming soon | unknown.chat" },
  description:
    "unknown+ is coming soon: save your chats, no skips, build your own personas, and better matches — for about $5/month.",
  alternates: { canonical: `${SITE_URL}/plus` },
  openGraph: {
    title: "unknown+ — coming soon",
    description: "Save chats, no skips, build your own personas, better match — ~$5/mo.",
    url: `${SITE_URL}/plus`,
  },
};

// The ONE hero feature (Apple-style — make one bigger than the rest).
const HERO_FEATURE = {
  emoji: "💾",
  title: "Save Chats",
  line: "The conversations that usually disappear… don’t anymore.",
};

// Supporting trio.
const FEATURES: { emoji: string; title: string; desc: string }[] = [
  { emoji: "🚫", title: "No skips", desc: "Strangers stay. No ghosting, no leaving you mid-chat." },
  { emoji: "🎨", title: "Build your own personas", desc: "Design your stranger — their vibe, backstory, the way they text." },
  { emoji: "💘", title: "Better match", desc: "Pick the exact mood, energy & personality — not a random draw." },
];

export default function PlusPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>

          {/* Hero */}
          <div className="mt-6 text-center">
            <span className="inline-block rounded-full border-2 border-ink bg-yellow px-3 py-1 font-display text-sm font-bold text-ink -rotate-2 shadow-hard-xs">
              coming soon ✦
            </span>
            <h1 className="mt-4 font-sans text-4xl lg:text-5xl font-bold tracking-tight">
              unknown<span className="text-red">+</span>
            </h1>
            <p className="mt-3 font-serif italic text-lg text-ink-soft max-w-md mx-auto">
              everything you love about unknown.chat — turned up. for the people who don&apos;t want the chat to end.
            </p>

            <div className="mt-5 inline-flex items-baseline gap-1.5 rounded-2xl border-2 border-ink bg-paper-cool px-5 py-3 shadow-hard-sm rotate-[0.5deg]">
              <span className="font-sans text-3xl font-bold text-ink">$5</span>
              <span className="font-display text-ink-mute">/ month</span>
            </div>

            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-lilac px-3.5 py-1 font-display text-sm font-bold text-ink shadow-hard-xs -rotate-1">
                <span className="h-[6px] w-[6px] rounded-full bg-red live-blink" aria-hidden />
                3,200 people waiting
              </span>
            </div>

            <p className="mt-2.5 font-display text-xs text-ink-mute">cancel anytime · 7-day money-back guarantee</p>
          </div>

          {/* Hero feature — one bigger than the rest (Apple-style) */}
          <div className="mt-10 relative overflow-hidden rounded-3xl border-[2.5px] border-ink bg-gradient-to-br from-lilac/55 via-paper-cool to-yellow/40 p-6 lg:p-8 shadow-hard -rotate-[0.4deg]">
            <div className="text-4xl lg:text-5xl">{HERO_FEATURE.emoji}</div>
            <h2 className="mt-3 font-sans text-2xl lg:text-4xl font-bold tracking-tight text-ink">
              {HERO_FEATURE.title}
            </h2>
            <p className="mt-2 font-serif italic text-lg lg:text-2xl leading-snug text-ink-soft max-w-md">
              {HERO_FEATURE.line}
            </p>
          </div>

          {/* Supporting trio */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard-sm"
                style={{ transform: `rotate(${i % 2 === 0 ? -0.3 : 0.3}deg)` }}
              >
                <div className="text-2xl">{f.emoji}</div>
                <div className="mt-1.5 font-sans text-[15px] font-bold text-ink">{f.title}</div>
                <p className="mt-1 font-display text-[13px] leading-relaxed text-ink-soft">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Beta registration */}
          <div className="mt-10">
            <PlusBetaForm />
            <p className="mt-4 text-center font-display text-xs text-ink-mute">
              see our <Link href="/refund" className="underline text-red">refund policy</Link>
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
