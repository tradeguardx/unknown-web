// Step 1 — "who do you want to meet?" The roster (filtered by the meet pref) as
// cards: striped photo + archetype, name/occupation, traits, a quote, flavor chips,
// and a match %. Vibe chips (soft / sharp / weird) filter; "surprise me" picks one.

import { useMemo, useState } from "react";
import { DateShell } from "../DateShell";
import { StripePhoto } from "../StripePhoto";
import { ageForBand } from "@/lib/experiences/personas";
import type { DateConfig, DatePersonaCard } from "@/lib/matchApi";
import type { MeetPref, AgeBand } from "./Preferences";

interface Props {
  cfg: DateConfig;
  meet: MeetPref | null;
  ageBand: AgeBand | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onLeave: () => void;
}

// Midpoint of each age band → we cast personas closest to the dater's age first,
// so an 18–24 dater meets the younger, softer characters before the older ones.
const BAND_MID: Record<string, number> = { "18-24": 21, "25-31": 28, "32-39": 35, "40-49": 44, "50+": 55 };

type Vibe = "all" | "soft" | "sharp" | "weird";

// Stable pseudo "match %" per persona (decorative, 58–91).
function matchPct(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 58 + (h % 34);
}

function byMeet(cfg: DateConfig, meet: MeetPref | null): DatePersonaCard[] {
  if (!meet || meet === "everyone" || meet === "surprise") return cfg.personas;
  const g = meet === "women" ? "female" : "male";
  return cfg.personas.filter((p) => p.gender === g);
}

export function CharacterPicker({ cfg, meet, ageBand, selectedId, onSelect, onNext, onLeave }: Props) {
  const base = useMemo(() => {
    const list = byMeet(cfg, meet);
    const mid = (ageBand && BAND_MID[ageBand]) || 28;
    // Show ALL matching-gender personas, but ordered by closeness to the dater's
    // age — so age-appropriate ones lead, and nobody is hidden on a small roster.
    return [...list].sort((a, b) => Math.abs(a.age - mid) - Math.abs(b.age - mid));
  }, [cfg, meet, ageBand]);
  const [vibe, setVibe] = useState<Vibe>("all");
  const list = vibe === "all" ? base : base.filter((p) => p.vibe === vibe);
  const selected = cfg.personas.find((p) => p.id === selectedId) ?? null;

  const surprise = () => {
    const pool = list.length ? list : base;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) onSelect(pick.id);
  };

  const chips: { key: Vibe | "surprise"; label: string }[] = [
    { key: "all", label: `all ${base.length}` },
    { key: "soft", label: "soft" },
    { key: "sharp", label: "sharp" },
    { key: "weird", label: "weird" },
    { key: "surprise", label: "🎲 surprise me" },
  ];

  return (
    <DateShell
      step="step 1 of 3 — pick your date"
      onLeave={onLeave}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="hidden sm:block font-display italic text-[13px] text-ink-mute">
            ↖ hover a card to hear two seconds of their voice
          </span>
          <div className="flex items-center gap-3 ml-auto">
            {selected && <span className="font-display italic text-[13px] text-ink-mute">{selected.name.toLowerCase()} selected</span>}
            <button
              onClick={onNext}
              disabled={!selectedId}
              className="rounded-full border-2 border-ink bg-red px-5 sm:px-7 py-2.5 font-sans text-[13px] sm:text-sm font-bold text-paper-cool shadow-hard-xs hover:shadow-hard disabled:opacity-40"
            >
              pick the place →
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <p className="font-display italic text-[13px] text-red mb-1">— nobody&apos;s a model here, they&apos;re just awake —</p>
          <h2 className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            who do you want to <span className="text-red italic font-display">meet</span>?
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-0">
          {chips.map((c) => {
            const active = c.key === vibe;
            const isSurprise = c.key === "surprise";
            return (
              <button
                key={c.key}
                onClick={() => (isSurprise ? surprise() : setVibe(c.key as Vibe))}
                className={`rounded-full border-2 px-3 py-1 font-sans text-[12px] font-bold transition ${
                  isSurprise
                    ? "border-ink bg-lilac text-ink"
                    : active
                      ? "border-ink bg-ink text-paper-cool"
                      : "border-ink/40 bg-paper-cool text-ink hover:border-ink"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`group relative text-left rounded-2xl border-2 bg-paper-cool p-3 transition ${
                active ? "border-ink shadow-hard -translate-y-0.5" : "border-ink/25 hover:border-ink shadow-hard-xs"
              }`}
            >
              {/* match % — rotated sticker overlapping the top-right corner */}
              <span className="absolute -top-2.5 right-1 z-10 rotate-6 rounded-full border-[1.5px] border-ink bg-yellow px-2 py-0.5 font-sans text-[11px] font-bold text-ink shadow-hard-xs">
                {matchPct(p.id)}% match
              </span>
              <StripePhoto color={p.stripeColor} photoUrl={p.photoUrl ?? undefined} alt={p.name} variant="portrait" aiStamp className="mb-2.5" />
              {/* archetype pill ABOVE the name, never over the face */}
              <span className="inline-block rounded-full border-[1.5px] border-ink bg-ink px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-paper-cool">
                {p.archetypeLabel}
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-sans text-lg font-bold text-ink">{p.name}</span>
                <span className="font-display italic text-[12px] text-ink-mute truncate">{p.occupation}, {ageForBand(p.id, ageBand)}</span>
              </div>
              <p className="font-display italic text-[12px] text-ink-mute mt-0.5">{p.traits.join(" · ")}</p>
              <p className="font-serif italic text-[13px] text-ink mt-1.5 leading-snug">“{p.quote}”</p>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {p.chips.map((c, i) => (
                  <span key={i} className="rounded-full border-[1.5px] border-ink/50 bg-paper px-2 py-0.5 font-sans text-[10.5px] font-semibold text-ink-soft">
                    {c.emoji} {c.label}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </DateShell>
  );
}
