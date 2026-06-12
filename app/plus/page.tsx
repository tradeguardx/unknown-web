import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL, SOCIALS } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "unknown+ — coming soon | unknown.chat" },
  description:
    "unknown+ is coming soon: save your chats, deeper personas, audio chat, perfect match, and unlimited strangers — for about $5/month.",
  alternates: { canonical: `${SITE_URL}/plus` },
  openGraph: {
    title: "unknown+ — coming soon",
    description: "Save chats, deeper personas, audio chat, perfect match, unlimited — ~$5/mo.",
    url: `${SITE_URL}/plus`,
  },
};

const IG = SOCIALS.find((s) => s.name === "Instagram" && s.url);

const FEATURES: { emoji: string; title: string; desc: string }[] = [
  { emoji: "💾", title: "Save your chats", desc: "Keep the conversations that usually vanish when you close the tab." },
  { emoji: "🧠", title: "Better personas", desc: "Smarter, deeper strangers with more memory — they remember you across chats." },
  { emoji: "🎙️", title: "Audio chat", desc: "Actually talk out loud, not just text. Hear the persona, voice your side." },
  { emoji: "💘", title: "Perfect match", desc: "Pick the exact vibe — mood, personality, country, energy — instead of a random draw." },
  { emoji: "♾️", title: "Unlimited", desc: "No caps, no waiting, no captcha. Skip to a fresh stranger as much as you want." },
  { emoji: "🎨", title: "Custom personas", desc: "Shape your own stranger — looks, backstory, the way they text." },
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

          {/* Features */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* CTA */}
          <div className="mt-10 text-center">
            <p className="font-display text-ink-soft">
              not live yet — we&apos;re building it. follow for the launch:
            </p>
            {IG && (
              <a
                href={IG.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-red px-5 py-2.5 font-sans font-bold tracking-tight text-paper-cool shadow-hard transition-transform hover:-translate-y-0.5"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
                </svg>
                follow {IG.handle} for launch
              </a>
            )}
            <p className="mt-4 font-display text-xs text-ink-mute">
              see our <Link href="/refund" className="underline text-red">refund policy</Link> · early users get unlimited new personas free
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
