"use client";

// "what are you in the mood for?" — two doors: stranger chat vs the AI date.
// Separates the two gradient banners and finally gives stranger chat a real pitch.

import Link from "next/link";

export function TwoDoors({ onStranger }: { onStranger: () => void }) {
  return (
    <section className="mt-10 lg:mt-16">
      <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-4">
        what are you in the mood for?
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* stranger */}
        <div className="flex flex-col rounded-2xl border-[2.5px] border-ink bg-paper-cool p-5 shadow-hard">
          <div className="font-sans text-xl font-bold text-ink">talk to a stranger</div>
          <p className="mt-1 font-serif italic text-[15px] text-ink-soft leading-snug">
            A new person every time. They can ghost you. They usually do.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["random", "no time limit", "skip anytime"].map((t) => (
              <span key={t} className="rounded-full border-[1.5px] border-ink bg-paper px-2.5 py-0.5 font-sans text-[11.5px] font-semibold text-ink-soft">{t}</span>
            ))}
          </div>
          <button
            onClick={onStranger}
            className="om-cta mt-5 inline-flex w-fit items-center gap-1 self-start rounded-xl border-2 border-ink bg-ink px-5 py-2.5 font-sans text-sm font-bold text-paper-cool"
            style={{ boxShadow: "4px 4px 0 #e8503f" }}
          >
            find someone awake →
          </button>
          <span className="mt-2 font-display text-[14px] text-ink-mute">free forever</span>
        </div>

        {/* date */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl border-[2.5px] border-ink bg-gradient-to-br from-lilac/55 via-paper-cool to-red/25 p-5 shadow-hard">
          <span className="absolute right-3 top-3 -rotate-6 rounded-full border-[1.5px] border-ink bg-red px-2.5 py-0.5 font-sans text-[11px] font-bold text-paper-cool">new</span>
          <div className="font-sans text-xl font-bold text-ink">go on an AI date</div>
          <p className="mt-1 font-serif italic text-[15px] text-ink-soft leading-snug">
            15 minutes. one person. a score out of 100 at the end.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["pick your date", "pick the scene", "get scored", "voice or text"].map((t) => (
              <span key={t} className="rounded-full border-[1.5px] border-ink bg-paper-cool px-2.5 py-0.5 font-sans text-[11.5px] font-semibold text-ink">{t}</span>
            ))}
          </div>
          <Link
            href="/date"
            className="om-cta mt-5 inline-flex w-fit items-center gap-1 self-start rounded-xl border-2 border-ink bg-red px-5 py-2.5 font-sans text-sm font-bold text-paper-cool shadow-hard-xs"
          >
            💘 go on a date →
          </Link>
          <span className="mt-2 font-display text-[14px] text-ink-mute">most people get 61</span>
        </div>
      </div>
      <p className="mt-3 text-center font-display italic text-[14px] text-ink-mute">
        switch doors any time — nothing is saved either way.
      </p>
    </section>
  );
}
