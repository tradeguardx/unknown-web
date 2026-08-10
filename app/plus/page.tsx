import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";
import { PlusSubscribe } from "@/components/match/PlusSubscribe";

export const metadata: Metadata = {
  title: { absolute: "unknown plus — unlimited chats, saved forever | unknown.chat" },
  description:
    "unknown plus keeps your conversations going: save & resume any chat, unlimited messages, strangers who never skip out — from $4.99/month, local currency at checkout.",
  alternates: { canonical: `${SITE_URL}/plus` },
  openGraph: {
    title: "unknown plus — unlimited chats, saved forever",
    description: "Save & resume chats, unlimited messages, no skips. From $4.99/mo.",
    url: `${SITE_URL}/plus`,
  },
};

// The ONE hero feature (Apple-style — make one bigger than the rest).
const HERO_FEATURE = {
  emoji: "💾",
  title: "Chats that don't disappear",
  line: "Save anyone you click with and pick the conversation right back up — days later, on any device.",
};

// Supporting trio — what unknown+ actually unlocks today.
const FEATURES: { emoji: string; title: string; desc: string }[] = [
  { emoji: "♾️", title: "Unlimited messages", desc: "Talk as long as you want. No daily caps, no running out mid-conversation." },
  { emoji: "🚫", title: "No skips", desc: "Your strangers stay. No ghosting, no one leaving you mid-chat." },
  { emoji: "💘", title: "Deeper connection", desc: "They remember your chats and grow with them — not a fresh stranger every time." },
];

export default function PlusPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>

          {/* Hero */}
          <div className="mt-6 text-center">
            <h1 className="font-sans text-4xl lg:text-5xl font-bold tracking-tight">
              unknown <span className="text-red">plus</span>
            </h1>
            <p className="mt-3 font-serif italic text-lg text-ink-soft max-w-md mx-auto">
              everything you love about unknown.chat — turned up. for the people who don&apos;t want the chat to end.
            </p>
          </div>

          {/* Live tier cards — geo-priced, account-aware (Free · Plus · 2-day) */}
          <div className="mt-7 max-w-sm lg:max-w-5xl mx-auto">
            <PlusSubscribe />
          </div>

          {/* what actually changes — comparison */}
          <ComparisonTable />

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

          <p className="mt-8 text-center font-display text-xs text-ink-mute">
            questions? see our{" "}
            <Link href="/refund" className="underline text-red">refund policy</Link>
            {" · "}
            <Link href="/faq" className="underline text-red">faq</Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

// "what actually changes" — the honest Free-vs-Plus comparison. Free stated
// plainly (a table where free looks useless reads as a trick).
function ComparisonTable() {
  const rows: [string, string, string][] = [
    ["stranger chat", "unlimited", "unlimited"],
    ["time per chat", "20 minutes", "no limit"],
    ["AI dates", "1 per day", "unlimited"],
    ["dating report", "score + summary", "+ transcript & her notes"],
    ["voice mode", "5-min trial", "unlimited"],
    ["saved chats", "—", "every one, any device"],
    ["they remember you", "—", "yes"],
    ["skips", "they can leave", "nobody leaves"],
  ];
  return (
    <section className="mt-14">
      <h2 className="mb-4 text-center font-sans text-2xl lg:text-3xl font-bold tracking-tight text-ink">what actually changes</h2>
      <div className="overflow-x-auto rounded-2xl border-2 border-ink">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-ink font-sans text-[11px] uppercase tracking-wide text-paper-cool">
              <th className="px-3 py-3 font-bold"> </th>
              <th className="px-3 py-3 font-bold text-paper-cool/70">free</th>
              <th className="px-3 py-3 font-bold text-red">plus</th>
            </tr>
          </thead>
          <tbody className="font-sans text-[13px]">
            {rows.map(([label, free, plus], i) => (
              <tr key={i} className="border-t border-dashed border-ink/20">
                <td className="px-3 py-3 font-bold text-ink">{label}</td>
                <td className="px-3 py-3 text-ink-mute">{free}</td>
                <td className="px-3 py-3 font-bold text-ink" style={{ background: "rgba(232,80,63,0.07)" }}>{plus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-center font-serif italic text-[15px] text-ink-mute">
        try it free first. if the timer never bothers you, don&apos;t pay us.
      </p>
    </section>
  );
}
