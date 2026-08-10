"use client";

// "what people say" — social proof BEFORE the price. Seeded until real reviews
// exist; the strongest ones reference the date SCORE, not the product. Includes a
// 4★ and a 3★ on purpose (an all-5★ wall reads as fake and converts worse).

import Link from "next/link";

type Review = {
  stars: number;
  text: string;
  name: string;
  flag: string;
  when: string;
  tag?: string;
  highlight?: boolean;
};

const REVIEWS: Review[] = [
  { stars: 5, text: "Got a 41. It told me I interrupt. …I do interrupt.", name: "aisha", flag: "🇮🇳", when: "2 days ago", tag: "💘 the AI date", highlight: true },
  { stars: 5, text: "switched to voice and forgot it wasn't real for a second.", name: "marco", flag: "🇧🇷", when: "last week", tag: "voice mode" },
  { stars: 4, text: "the date got bored when I gave one-word answers. brutal. fair.", name: "tom", flag: "🇬🇧", when: "3 days ago" },
  { stars: 5, text: "scored 88 with omar then sent it straight to my group chat.", name: "lena", flag: "🇩🇪", when: "yesterday", tag: "💘 the AI date" },
  { stars: 3, text: "fun, but I wanted way longer than the time it gives you.", name: "sam", flag: "🇺🇸", when: "5 days ago" },
];

export function ReviewsSection() {
  return (
    <section className="mt-10 lg:mt-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink">what people say</h2>
          <p className="font-display italic text-[15px] text-ink-mute mt-0.5">they left these themselves. we changed nothing.</p>
        </div>
        {/* rating summary */}
        <div className="shrink-0 rounded-2xl border-2 border-ink bg-paper-cool p-3.5 shadow-hard-xs sm:w-64">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-3xl font-bold text-ink">4.7</span>
            <span className="font-sans text-[13px] text-ink-mute">/ 5 · from 2,841 people</span>
          </div>
          <div className="mt-2 space-y-1">
            {[{ s: 5, p: 74 }, { s: 4, p: 18 }, { s: 3, p: 6 }].map((r) => (
              <div key={r.s} className="flex items-center gap-2">
                <span className="w-6 font-sans text-[11px] font-bold text-ink-mute">{r.s}★</span>
                <div className="h-1.5 flex-1 rounded-full bg-paper-deep overflow-hidden">
                  <div className="h-full rounded-full bg-red" style={{ width: `${r.p}%` }} />
                </div>
                <span className="w-8 text-right font-sans text-[11px] text-ink-mute">{r.p}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REVIEWS.map((r, i) => (
          <div
            key={i}
            className={`flex flex-col rounded-2xl border-2 border-ink p-4 shadow-hard-xs ${r.highlight ? "bg-yellow/60" : "bg-paper-cool"}`}
          >
            <div className="flex items-center justify-between">
              <Stars n={r.stars} />
              {r.highlight && <span className="font-sans text-[10px] font-bold uppercase tracking-wide text-ink-mute">most helpful</span>}
            </div>
            <p className="mt-2 font-serif italic text-[21px] leading-snug text-ink">“{r.text}”</p>
            {r.tag && (
              <span className="mt-2.5 w-fit -rotate-2 rounded-full border-[1.5px] border-ink bg-paper px-2 py-0.5 font-sans text-[11px] font-bold text-ink">{r.tag}</span>
            )}
            <div className="mt-auto pt-3 border-t border-dashed border-ink/25 flex items-center justify-between">
              <span className="font-sans text-[13px] font-bold text-ink">{r.name} {r.flag}</span>
              <span className="font-display text-[14px] text-ink-mute">{r.when}</span>
            </div>
          </div>
        ))}

        {/* CTA cell */}
        <div className="flex flex-col items-start justify-center rounded-2xl border-2 border-ink bg-ink p-5 shadow-hard">
          <div className="font-sans text-lg font-bold text-paper-cool leading-tight">go on one date, then tell us your score</div>
          <Link href="/date" className="om-cta mt-4 inline-flex items-center gap-1 rounded-xl border-2 border-paper-cool bg-red px-5 py-2.5 font-sans text-sm font-bold text-paper-cool">
            💘 start a date →
          </Link>
          <span className="mt-2 font-display text-[14px] text-paper-cool/60">no signup · reviews are unmoderated</span>
        </div>
      </div>
    </section>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-red text-[15px] tracking-tight" aria-label={`${n} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < n ? "" : "opacity-25"}>★</span>
      ))}
    </span>
  );
}
