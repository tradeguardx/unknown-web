"use client";

// The new mobile-first landing page. Owns the open/close state of the
// bottom-sheet prefs modal and renders every visual section (hero, mini-chat
// preview, overheard scroll cards, why-postits, footer).
//
// Static sections could be split into smaller server components, but the
// landing is small enough that one client component keeps things readable.
// Everything below the fold (overheard / postits / footer) renders
// statically — they're just decorative.

import Link from "next/link";
import { useState } from "react";
import { PrefsSheet } from "./PrefsSheet";
import { MenuDrawer } from "./MenuDrawer";
import { Testimonials } from "./Testimonials";
import type { TestimonialsData } from "@/lib/testimonials";

export function MobileLanding({ testimonials }: { testimonials?: TestimonialsData | null }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onMenu={() => setMenuOpen(true)} />

      <main className="flex-1 px-5 lg:px-10 pb-10 lg:pb-20 relative max-w-md lg:max-w-5xl mx-auto w-full">
        <DoodleSquiggle className="absolute top-16 -left-2 w-14 lg:w-20 lg:top-24 lg:-left-4 -rotate-[15deg] opacity-75" />
        <DoodleArc className="absolute top-24 -right-3 w-16 lg:w-24 lg:top-32 lg:-right-4 rotate-[20deg] opacity-75" />

        {/* Hero + mini chat stack on mobile, sit side-by-side on lg+ so the
            desktop landing actually fills the viewport instead of feeling like
            a phone frame floating in white space. */}
        <section className="lg:grid lg:grid-cols-2 lg:gap-14 lg:items-center lg:pt-8">
          <Hero onStart={() => setSheetOpen(true)} />
          <MiniChat onTap={() => setSheetOpen(true)} />
        </section>

        <OverheardSection />
        <Testimonials data={testimonials ?? null} />
        <WhyPostits />
        <Footer />
      </main>

      <PrefsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

// ─── header ──────────────────────────────────────────────────────────────

function Header({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex items-center justify-between px-5 lg:px-10 pt-4 lg:pt-6 pb-2 max-w-md lg:max-w-5xl mx-auto w-full">
      <Wordmark size="sm" />
      <div className="flex items-center gap-2.5 lg:gap-4">
        <LiveCounter />
        <button onClick={onMenu} className="p-1 text-ink-soft hover:text-ink" aria-label="menu">
          <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h14M3 10h14M3 14h14" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  if (size === "lg") {
    return (
      <h1 className="inline-block relative font-sans font-bold text-5xl lg:text-7xl xl:text-8xl leading-[0.9] tracking-[-0.05em] text-ink mb-3.5 lg:mb-5">
        unknown
        <span className="text-red text-[0.65em] inline-block -translate-y-[0.12em]">.</span>
        chat
      </h1>
    );
  }
  return (
    <Link
      href="/"
      className="wordmark-underline font-sans font-bold text-base lg:text-lg tracking-[-0.025em] text-ink inline-flex items-baseline relative no-underline"
    >
      unknown<span className="text-red text-[19px] lg:text-[22px] -translate-y-[2px]">.</span>chat
    </Link>
  );
}

function LiveCounter() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-[3px] bg-yellow border-[1.5px] border-ink rounded-full font-display text-[13px] text-ink font-bold -rotate-2 shadow-hard-xs">
      <span className="w-[5px] h-[5px] rounded-full bg-red live-blink" />
      <span>1.2k awake</span>
    </div>
  );
}

// ─── hero ────────────────────────────────────────────────────────────────

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="pt-4 lg:pt-0 pb-6 lg:pb-0 text-center lg:text-left relative">
      <div className="inline-flex items-center gap-[7px] font-display text-lg lg:text-xl text-red font-semibold mb-2.5 lg:mb-4 -rotate-2 before:content-[''] before:w-[18px] before:h-[1.5px] before:bg-red before:rounded after:content-[''] after:w-[18px] after:h-[1.5px] after:bg-red after:rounded">
        talk to a stranger · no signup
      </div>

      <div className="relative inline-block py-2">
        <span className="absolute top-6 left-2.5 lg:top-8 lg:left-4 z-[5] bg-yellow border-[1.5px] border-ink rounded-full px-2.5 py-1 font-display text-sm lg:text-base font-bold text-ink shadow-hard-xs -rotate-[10deg] whitespace-nowrap">
          3am ✦
        </span>
        <span className="absolute top-8 right-2 lg:top-12 lg:-right-4 z-[5] bg-lilac border-[1.5px] border-ink rounded-full px-2.5 py-1 font-display text-sm lg:text-base font-bold text-ink shadow-hard-xs rotate-[8deg] whitespace-nowrap">
          just AI ♡
        </span>
        <Wordmark size="lg" />
      </div>

      <p className="font-serif italic text-[17px] lg:text-2xl xl:text-[26px] text-ink-soft leading-[1.25] max-w-[280px] lg:max-w-[480px] mx-auto lg:mx-0">
        for when it&apos;s <span className="bg-yellow px-1.5">3am</span>
        <br />and you wanna talk but
        <br />
        <span className="line-through decoration-red decoration-2 text-ink-mute">no one&apos;s</span>{" "}
        <em>actually</em> no one&apos;s awake.
      </p>

      {/* Primary CTA — the unambiguous start path. Lives above the fold,
          impossible to miss. Mini chat below acts as a secondary preview.
          attention-pulse runs ~6 cycles on mount so first-time visitors
          notice it; pause on hover/focus so it doesn't fight the active
          state. Respects prefers-reduced-motion via globals.css. */}
      <button
        onClick={onStart}
        className="attention-pulse mt-5 lg:mt-7 inline-flex items-center gap-2 bg-red text-paper-cool border-2 border-ink rounded-2xl px-6 lg:px-8 py-3 lg:py-4 font-sans text-base lg:text-lg font-bold tracking-tight shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all"
      >
        find someone awake
        <span aria-hidden>→</span>
      </button>

      <p className="mt-2.5 font-display text-sm lg:text-base text-ink-mute">
        no signup · takes 5 seconds
      </p>
    </section>
  );
}

// ─── mini chat preview ───────────────────────────────────────────────────

function MiniChat({ onTap }: { onTap: () => void }) {
  return (
    <div className="relative mt-4 lg:mt-0 lg:max-w-md lg:ml-auto w-full">
      <span
        className="absolute -top-1.5 left-6 w-[60px] h-[14px] bg-lilac border border-ink -rotate-[4deg] opacity-85 tape-stripe z-10"
        aria-hidden
      />
      <div className="bg-paper-cool border-2 border-ink rounded-2xl p-3.5 lg:p-5 shadow-hard -rotate-[0.5deg]">
        <div className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-ink mb-2.5 pb-2 border-b-[1.5px] border-dashed border-paper-deep">
          <span className="stranger-blob">
            <span className="w-[4px] h-[4px] rounded-full bg-paper-cool inline-block mr-1" />
            stranger
          </span>
          is here ✦
        </div>

        <div className="font-mono text-[12.5px] leading-relaxed mb-2.5">
          <div><span className="text-stranger font-semibold">stranger:</span> <span className="text-ink">hey 👋</span></div>
          <div><span className="text-stranger font-semibold">stranger:</span> <span className="text-ink">ngl wasn&apos;t expecting anyone on</span></div>
          <div className="flex items-center gap-1 mt-0.5 text-[11.5px] text-ink-mute">
            <span className="text-stranger font-semibold">stranger</span>
            <span className="inline-flex gap-0.5 ml-1">
              <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" />
              <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" style={{ animationDelay: "0.15s" }} />
              <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" style={{ animationDelay: "0.3s" }} />
            </span>
          </div>
        </div>

        <button
          onClick={onTap}
          className="w-full flex items-center justify-between gap-2 bg-ink text-paper-cool border-[1.5px] border-ink rounded-xl px-4 py-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <span className="font-sans text-[13px] font-bold tracking-tight">
            join the chat →
          </span>
          <span className="font-display text-[13px] text-paper-cool/70">
            tap to start
          </span>
        </button>

        <p className="text-center mt-2 font-display text-[13px] text-ink-mute">
          ⚠ AI persona ·{" "}
          <Link href="/about" className="text-red underline font-semibold">read more</Link>
        </p>
      </div>

      <style jsx>{`
        :global(.stranger-blob) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #e64a3a;
          color: #faf5e6;
          padding: 1px 8px;
          border-radius: 100px;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 10px;
          font-weight: 700;
          transform: rotate(-2deg);
        }
      `}</style>
    </div>
  );
}

// ─── overheard tonight ───────────────────────────────────────────────────

const OVERHEARD_SAMPLES = [
  {
    sticker: { label: "cute", color: "yellow" as const },
    loc: "bangalore",
    time: "22:14",
    lines: [
      { role: "str" as const, text: "hii kya kar rahe ho" },
      { role: "you" as const, text: "just chilling u" },
      { role: "str" as const, text: "same boss ne meeting rakhi 😩" },
    ],
  },
  {
    sticker: { label: "brutal", color: "red" as const },
    loc: "delhi",
    time: "23:50",
    lines: [
      { role: "str" as const, text: "han kya 😂 u good or just confirming u exist" },
      { role: "str" as const, text: "k bye" },
    ],
    ended: "stranger disconnected (silent).",
  },
  {
    sticker: { label: "3am", color: "lilac" as const },
    loc: "são paulo",
    time: "03:42",
    lines: [
      { role: "str" as const, text: "ok this is weird but hi" },
      { role: "you" as const, text: "lol weird how?" },
      { role: "str" as const, text: "idk i never do this. cant sleep" },
    ],
  },
  {
    sticker: { label: "vibe", color: "yellow" as const },
    loc: "tokyo",
    time: "11:08",
    lines: [
      { role: "str" as const, text: "i was about to leave but ok" },
      { role: "you" as const, text: "lucky me lol" },
      { role: "str" as const, text: "we'll see 👀" },
    ],
  },
];

function OverheardSection() {
  return (
    <section className="mt-8 lg:mt-20">
      <div className="text-center mb-4 lg:mb-8">
        <h3 className="font-sans font-bold text-2xl lg:text-4xl xl:text-5xl tracking-[-0.035em]">
          overheard <span className="font-serif italic text-red font-normal">tonight</span>
        </h3>
        <span className="block font-display text-sm lg:text-lg text-ink-mute mt-0.5 -rotate-2">↙ swipe to read more</span>
      </div>

      <div className="flex gap-3 lg:gap-6 overflow-x-auto overflow-y-visible py-3.5 lg:py-6 -mx-5 px-5 lg:-mx-10 lg:px-10 scrollbar-none">
        {OVERHEARD_SAMPLES.map((sample, i) => (
          <OverheardCard key={i} idx={i} {...sample} />
        ))}
      </div>

      <style jsx>{`
        .scrollbar-none { scrollbar-width: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}

type OverheardCardProps = (typeof OVERHEARD_SAMPLES)[number] & { idx: number };

function OverheardCard({ sticker, loc, time, lines, ended, idx }: OverheardCardProps) {
  // Each card gets a slightly different micro-rotation + tiny vertical offset
  // so the row feels hand-arranged rather than mechanically aligned.
  const tilts = ["-rotate-2", "rotate-[1.5deg]", "-rotate-1", "rotate-2"];
  const offsets = ["mt-0", "mt-1.5", "mt-0", "mt-1"];
  const stickerColor =
    sticker.color === "red" ? "bg-red text-paper-cool"
    : sticker.color === "lilac" ? "bg-lilac text-ink"
    : "bg-yellow text-ink";

  return (
    <div
      className={`relative flex-shrink-0 w-[220px] lg:w-[280px] bg-paper-cool border-[1.5px] border-ink rounded-xl p-3 lg:p-4 shadow-hard ${tilts[idx % 4]} ${offsets[idx % 4]}`}
    >
      <span
        className={`absolute -top-2 -right-1 ${stickerColor} border border-ink rounded-full px-1.5 py-[2px] font-display text-xs font-bold rotate-[8deg] shadow-hard-xs`}
      >
        {sticker.label}
      </span>

      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-dashed border-paper-deep">
        <span className="font-display text-sm font-bold text-ink">
          <span className="text-[11px]">📍</span> {loc}
        </span>
        <span className="font-mono text-[9px] text-ink-mute">{time}</span>
      </div>

      <div className="font-mono text-[11px] leading-[1.5]">
        {lines.map((l, i) => (
          <div key={i}>
            <span className={l.role === "str" ? "text-stranger font-semibold" : "text-you font-semibold"}>
              {l.role}:
            </span>{" "}
            <span className="text-ink">{l.text}</span>
          </div>
        ))}
        {ended && <div className="text-ink-mute italic text-[10px] mt-1 font-serif">{ended}</div>}
      </div>
    </div>
  );
}

// ─── why postits ─────────────────────────────────────────────────────────

const POSTIT_BG = ["bg-yellow-soft", "bg-red-soft", "bg-lilac-soft"];
const POSTIT_TILTS = ["-rotate-[1.5deg]", "rotate-1", "-rotate-1"];
const POSTITS = [
  { num: "01", title: "they're not real", body: "AI personas that text, mood-swing, and ghost like real people would" },
  { num: "02", title: "no account, ever", body: "no signup, no email. close tab → stranger's gone forever" },
  { num: "03", title: "every chat = new", body: "different person, country, mood, language. every. single. time." },
];

function WhyPostits() {
  return (
    <section className="mt-7 lg:mt-20 text-center">
      <h3 className="font-serif italic text-[22px] lg:text-3xl xl:text-4xl text-ink leading-tight mb-5 lg:mb-10 max-w-3xl mx-auto">
        it&apos;s like talking to a stranger at <span className="bg-yellow px-1.5">3am</span>, except they&apos;re actually available.
      </h3>
      <div className="flex flex-col lg:flex-row gap-3.5 lg:gap-6 lg:max-w-4xl lg:mx-auto">
        {POSTITS.map((p, i) => (
          <div
            key={p.num}
            className={`${POSTIT_BG[i]} ${POSTIT_TILTS[i]} flex-1 border-[1.5px] border-ink rounded-t rounded-b-xl px-3.5 lg:px-5 pt-3.5 lg:pt-6 pb-[18px] lg:pb-7 shadow-hard text-left relative`}
          >
            {/* washi tape stripe at top */}
            <span
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 -rotate-3 w-12 h-3 bg-white/50 border border-ink tape-stripe"
              aria-hidden
            />
            <div className="font-display text-xl lg:text-3xl font-bold text-red leading-none mb-1.5 lg:mb-3">{p.num}</div>
            <div className="font-sans text-sm lg:text-lg font-bold text-ink tracking-[-0.015em] mb-1 lg:mb-2">{p.title}</div>
            <p className="font-display text-[15px] lg:text-lg leading-[1.35] text-ink-soft font-medium">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── footer ──────────────────────────────────────────────────────────────

function Footer() {
  return (
    <div className="mt-7 lg:mt-20 pt-5 lg:pt-8 border-t-[1.5px] border-dashed border-paper-deep text-center font-display text-sm lg:text-base text-ink-mute">
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-2 font-sans text-xs lg:text-sm">
        <Link href="/about" className="text-ink-mute hover:text-ink">about</Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="text-ink-mute hover:text-ink">terms</Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="text-ink-mute hover:text-ink">privacy</Link>
      </div>
      <div>made for the strange &amp; sleepless ♡</div>
    </div>
  );
}

// ─── doodles ─────────────────────────────────────────────────────────────

function DoodleSquiggle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" fill="none" aria-hidden>
      <path
        d="M12 12 Q21 3 30 12 Q39 21 30 30 Q21 39 12 30 Q3 21 12 12"
        stroke="#e64a3a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M30 30 L45 45 M39 42 L45 45 L42 39"
        stroke="#e64a3a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoodleArc({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 70 60" fill="none" aria-hidden>
      <path d="M6 30 Q18 12 36 30 T66 30" stroke="#b89dd4" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="24" r="2" fill="#b89dd4" />
      <circle cx="36" cy="18" r="2" fill="#b89dd4" />
      <circle cx="60" cy="24" r="2" fill="#b89dd4" />
    </svg>
  );
}
