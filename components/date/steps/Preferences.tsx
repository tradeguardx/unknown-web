// Step 0 — "two taps, no signup". Who you are + who you'd like to meet. The meet
// choice filters the roster on the next step. Nothing is stored server-side here.

import { DateShell } from "../DateShell";
import { stripeStyle } from "../StripePhoto";
import type { DateConfig } from "@/lib/matchApi";

export type YouAre = "guy" | "girl" | "other";
export type MeetPref = "women" | "men" | "everyone" | "surprise";
export type AgeBand = "18-24" | "25-31" | "32-39" | "40-49" | "50+";

interface Props {
  cfg: DateConfig;
  you: YouAre | null;
  meet: MeetPref | null;
  ageBand: AgeBand | null;
  onYou: (y: YouAre) => void;
  onMeet: (m: MeetPref) => void;
  onAge: (a: AgeBand) => void;
  onNext: () => void;
  onLeave: () => void;
}

const AGE_BANDS: { key: AgeBand; note: string }[] = [
  { key: "18-24", note: "figuring it out, up for anything" },
  { key: "25-31", note: "building a life, still winging it" },
  { key: "32-39", note: "knows what they want, mostly" },
  { key: "40-49", note: "done pretending, refreshingly" },
  { key: "50+", note: "seen it all, still curious" },
];

const LILAC = "#b89dd4";
const YELLOW = "#f5d967";
const RED = "#e64a3a";
const MEDIA = "https://eppdibglxxapupwgssxu.supabase.co/storage/v1/object/public/media";

export function countMatches(cfg: DateConfig, meet: MeetPref | null): number {
  if (!meet || meet === "everyone" || meet === "surprise") return cfg.personas.length;
  const g = meet === "women" ? "female" : "male";
  return cfg.personas.filter((p) => p.gender === g).length;
}

export function Preferences({ cfg, you, meet, ageBand, onYou, onMeet, onAge, onNext, onLeave }: Props) {
  const count = countMatches(cfg, meet);
  // Face-down "deck" for the surprise tile — a few real portraits, blurred.
  const deck = cfg.personas.filter((p) => p.photoUrl).slice(0, 4);
  const youOpts: { key: YouAre; label: string; note?: string }[] = [
    { key: "guy", label: "guy" },
    { key: "girl", label: "girl" },
    { key: "other", label: "something else", note: "we won't ask twice" },
  ];
  const meetOpts: { key: MeetPref; label: string; color?: string; note?: string; dashed?: boolean; images?: string[] }[] = [
    { key: "women", label: "women", color: LILAC, images: [`${MEDIA}/female_02.png`] },
    { key: "men", label: "men", color: YELLOW, images: [`${MEDIA}/male_01.png`] },
    { key: "everyone", label: "everyone", color: RED, images: [`${MEDIA}/female_03.png`, `${MEDIA}/male_02.png`] },
    { key: "surprise", label: "surprise me", note: "riskier. better stories.", dashed: true },
  ];

  return (
    <DateShell
      step="step 0 — three taps, no signup"
      onLeave={onLeave}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="font-display italic text-[13px] text-ink-mute">
            {count} people match →
          </span>
          <button
            onClick={onNext}
            disabled={!you || !meet || !ageBand}
            className="rounded-full border-2 border-ink bg-red px-5 sm:px-7 py-2.5 font-sans text-[13px] sm:text-sm font-bold text-paper-cool shadow-hard-xs hover:shadow-hard disabled:opacity-40"
          >
            show me who&apos;s awake →
          </button>
        </div>
      }
    >
      <div className="flex min-h-full flex-col justify-center">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 lg:items-start">
          {/* LEFT — you're a… + you're roughly… */}
          <div className="flex flex-col gap-7">
            <div>
              <p className="font-display italic text-[13px] text-red mb-1">— only so we send the right person —</p>
              <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-3">you&apos;re a…</h2>
              <div className="flex flex-wrap gap-2">
                {youOpts.map((o) => {
                  const active = you === o.key;
                  return (
                    <button
                      key={o.key}
                      onClick={() => onYou(o.key)}
                      className={`min-h-[44px] rounded-full border-2 px-5 font-sans text-[15px] font-bold transition ${
                        active ? "border-ink bg-ink text-paper-cool" : "border-ink bg-paper-cool text-ink hover:-translate-y-0.5"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="font-display italic text-[13px] text-red mb-1">— sets who gets cast, and how they talk —</p>
              <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-3">you&apos;re roughly…</h2>
              <div className="flex flex-wrap items-center gap-2">
                {AGE_BANDS.map((a) => {
                  const active = ageBand === a.key;
                  return (
                    <button
                      key={a.key}
                      onClick={() => onAge(a.key)}
                      className={`min-h-[44px] rounded-full border-2 px-4 font-sans text-[15px] font-bold transition ${
                        active ? "border-ink bg-ink text-paper-cool" : "border-ink bg-paper-cool text-ink hover:-translate-y-0.5"
                      }`}
                    >
                      {a.key}
                    </button>
                  );
                })}
                {ageBand && (
                  <span className="font-display text-[16px] text-ink-mute">
                    {AGE_BANDS.find((a) => a.key === ageBand)?.note}
                  </span>
                )}
              </div>

              {/* 18+ — legally load-bearing, so it carries weight */}
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border-[1.5px] border-ink bg-paper-cool px-3.5 py-3">
                <span className="shrink-0 rounded-full bg-lilac px-2.5 py-1 font-sans text-[12px] font-bold text-ink">18+</span>
                <span className="font-sans text-[15px] leading-snug text-ink-soft">
                  18+ only · tapping through confirms it. not stored, not sold, gone when you close the tab.
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT — and you'd like to meet… */}
          <div className="flex flex-col">
            <p className="font-display italic text-[13px] text-red mb-1">— this is the fun one —</p>
            <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-ink mb-3">
              and you&apos;d like to <span className="text-red italic font-display">meet</span>…
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {meetOpts.map((o) => {
                const active = meet === o.key;
                if (o.dashed) {
                  // "surprise me" — a shuffled, face-down deck
                  return (
                    <button
                      key={o.key}
                      onClick={() => onMeet(o.key)}
                      className={`relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-3 text-center transition ${
                        active ? "border-ink bg-lilac-soft shadow-hard-xs" : "border-ink/50 bg-paper-cool hover:border-ink"
                      }`}
                    >
                      <div className="absolute inset-0" aria-hidden>
                        {deck.map((p, i) => {
                          const rot = [-9, -3, 4, 9][i] ?? 0;
                          const left = [8, 30, 22, 44][i] ?? 20; // % — fan across the tile
                          const top = [14, 8, 30, 22][i] ?? 16;
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={p.id}
                              src={p.photoUrl!}
                              alt=""
                              loading="lazy"
                              className="absolute h-[62%] w-[52%] rounded-xl border-2 border-ink object-cover object-[center_18%] shadow-hard-xs"
                              style={{ left: `${left}%`, top: `${top}%`, transform: `rotate(${rot}deg)`, filter: "blur(2px)", zIndex: i }}
                            />
                          );
                        })}
                        {/* fade so the pill stays readable over the stack */}
                        <span className="absolute inset-0 bg-paper-cool/25" />
                      </div>
                      <div className="relative z-10 rounded-2xl border-[1.5px] border-ink bg-paper-cool px-3 py-2">
                        <div className="font-sans text-base font-bold text-ink">🎲 {o.label}</div>
                        <div className="font-display italic text-[12px] text-ink-mute mt-0.5">{o.note}</div>
                      </div>
                    </button>
                  );
                }
                const combined = (o.images?.length ?? 0) > 1;
                return (
                  <button
                    key={o.key}
                    onClick={() => onMeet(o.key)}
                    className={`relative aspect-[4/5] overflow-hidden rounded-2xl border-2 transition ${
                      active ? "border-ink shadow-hard-xs" : "border-ink hover:-translate-y-0.5"
                    }`}
                    style={stripeStyle(o.color!)}
                  >
                    {/* portrait — one image, or a straight vertical split of two personas for "everyone" */}
                    {combined ? (
                      <div className="absolute inset-0 flex">
                        <div className="relative h-full w-1/2 overflow-hidden border-r-2 border-ink">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={o.images![0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[center_18%]" />
                        </div>
                        <div className="relative h-full w-1/2 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={o.images![1]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[center_18%]" />
                        </div>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.images![0]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[center_20%]" />
                    )}
                    {active && (
                      <span className="absolute right-2 top-2 -rotate-6 rounded-full bg-red px-2 py-0.5 font-sans text-[10px] font-bold text-paper-cool">picked</span>
                    )}
                    <span className="absolute bottom-2 left-2 rounded-lg border-[1.5px] border-ink bg-paper-cool px-2.5 py-1 font-sans text-[13px] font-bold text-ink">
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DateShell>
  );
}
