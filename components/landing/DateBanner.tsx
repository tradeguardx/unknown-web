"use client";

// Homepage hero banner for the AI Date experience — "so how good are you at
// dating?" A pitch + a live face strip (alternating f/m) + a preview of the
// shareable report you get at the end. Everything routes into /date.

import Link from "next/link";
import { useEffect, useState } from "react";

const MEDIA = "https://eppdibglxxapupwgssxu.supabase.co/storage/v1/object/public/media";

const FACES = [
  { name: "maya", age: 27, g: "f", src: `${MEDIA}/female_01.png` },
  { name: "kai", age: 29, g: "m", src: `${MEDIA}/male_01.png` },
  { name: "zara", age: 33, g: "f", src: `${MEDIA}/female_05.png` },
  { name: "rafi", age: 28, g: "m", src: `${MEDIA}/male_03.png` },
];

export function DateBanner() {
  const [dates, setDates] = useState(41203);
  useEffect(() => {
    const id = setInterval(() => setDates((n) => n + 2 + Math.floor(Math.random() * 3)), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative mt-9 lg:mt-14 overflow-hidden rounded-3xl border-[2.5px] border-ink bg-gradient-to-br from-lilac/45 via-paper-cool to-yellow/35 shadow-hard">
      {/* live "dates tonight" sticker */}
      <span className="absolute right-3 top-3 z-20 -rotate-3 rounded-full border-[1.5px] border-ink bg-yellow px-2.5 py-1 font-sans text-[11px] font-bold text-ink shadow-hard-xs">
        <span className="mr-1 inline-block h-[6px] w-[6px] rounded-full bg-red live-blink align-middle" />
        {dates.toLocaleString()} dates tonight
      </span>
      <div className="grid lg:grid-cols-[1fr_320px]">
        {/* left — the pitch + face strip */}
        <div className="p-5 sm:p-7 lg:border-r-2 lg:border-ink/10">
          <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink bg-red px-2.5 py-0.5 font-sans text-[12px] font-bold text-paper-cool -rotate-1">
            💘 new · the AI date
          </span>
          <p className="mt-3 font-display italic text-[14px] text-red">— 15 minutes. one AI. brutal honesty at the end —</p>
          <h2 className="mt-1 font-sans text-4xl sm:text-5xl font-bold tracking-tight text-ink leading-[0.95]">
            so how good<br className="hidden sm:block" /> are you at <span className="font-display italic text-red">dating</span>?
          </h2>
          <p className="mt-3 font-serif italic text-[16px] sm:text-[17px] text-ink-soft leading-snug max-w-lg">
            Pick who you meet. Take them out for 15 minutes. They&apos;ll flirt, push back, get bored if you&apos;re boring — then{" "}
            <mark className="bg-yellow/70 px-1 rounded">score you out of 100</mark>.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              href="/date"
              className="group inline-flex items-center gap-2 rounded-2xl border-2 border-ink bg-red px-7 py-3.5 font-sans text-base font-bold text-paper-cool shadow-hard hover:shadow-hard-lg transition"
            >
              test me <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <div className="font-display italic text-[13px] text-ink-mute leading-tight">
              free to try
              <br />
              <span className="text-red">most people get 61</span>
            </div>
          </div>

          {/* face strip */}
          <div className="mt-6 border-t-2 border-dashed border-ink/20 pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink-mute">who&apos;s awake right now</span>
              <span className="font-display italic text-[12px] text-ink-mute">women &amp; men · 20+ to meet</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {FACES.map((p) => (
                <Link key={p.name} href="/date" className="group relative overflow-hidden rounded-xl border-2 border-ink bg-paper-cool aspect-[4/5] shadow-hard-xs hover:-translate-y-0.5 transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[center_20%]" />
                  <span className="absolute bottom-1 left-1 rounded-md bg-ink/85 px-1.5 py-0.5 font-sans text-[10px] font-bold text-paper-cool">{p.name} · {p.g}</span>
                  <span className="absolute top-1 right-1 rounded-full border border-ink bg-paper-cool px-1.5 py-0.5 font-sans text-[8px] font-bold text-ink">✦AI</span>
                </Link>
              ))}
              {/* stacked-deck: blurred thumbs behind a +16 pill */}
              <Link href="/date" className="relative hidden sm:flex items-center justify-center rounded-xl border-2 border-dashed border-ink/50 bg-paper-cool/60 aspect-[4/5] overflow-hidden hover:border-ink transition">
                {FACES.slice(0, 3).map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.name}
                    src={p.src}
                    alt=""
                    aria-hidden
                    className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-lg border-2 border-ink object-cover object-[center_20%]"
                    style={{ transform: `rotate(${[-7, 3, 8][i]}deg)`, filter: "blur(1.6px)", zIndex: i }}
                  />
                ))}
                <span className="relative z-10 rounded-full border-[1.5px] border-ink bg-paper-cool px-3 py-1.5 font-sans text-base font-bold text-ink shadow-hard-xs">+16</span>
              </Link>
            </div>
          </div>
        </div>

        {/* right — what you get at the end (report preview) */}
        <aside className="flex flex-col justify-center p-5 sm:p-7 bg-paper-warm/40">
          <div className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink-mute mb-3">what you get at the end</div>
          <div className="rounded-2xl border-2 border-ink bg-paper-cool shadow-hard overflow-hidden">
            <div className="bg-red px-4 py-3 text-paper-cool">
              <div className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-90">❤ compatibility</div>
              <div className="font-sans text-4xl font-bold leading-none">78<span className="text-2xl">%</span></div>
            </div>
            <div className="p-4 space-y-3">
              <StatBar label="curiosity" score={91} color="#e64a3a" />
              <StatBar label="listening" score={74} color="#b89dd4" />
              <blockquote className="border-l-2 border-red pl-2 font-serif italic text-[13px] text-ink leading-snug">
                “Confident when joking. Guarded the second it got personal.”
              </blockquote>
            </div>
          </div>
          {/* fills the column + a share hook */}
          <div className="mt-3 -rotate-1 self-center rounded-full border-2 border-ink bg-yellow px-3.5 py-1.5 font-sans text-[12px] font-bold text-ink shadow-hard-xs">
            would she go again? &nbsp;<span className="text-red">yes · 82%</span>
          </div>
          <p className="mt-2.5 text-center font-display italic text-[13px] text-ink-mute">↑ your report. shareable, unfortunately.</p>
        </aside>
      </div>
    </section>
  );
}

function StatBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between font-sans text-[11px] font-bold text-ink-soft mb-0.5">
        <span className="capitalize">{label}</span>
        <span>{score}</span>
      </div>
      <div className="h-2.5 rounded-full bg-paper-deep border border-ink/30 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
