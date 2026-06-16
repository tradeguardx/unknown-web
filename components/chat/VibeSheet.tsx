"use client";

// Slide-up preferences sheet from the opener screen: pick the VIBE (mood),
// LANGUAGE, and who you're INTO, then start → saves prefs + re-rolls a stranger
// matched to all of it. Adult vibes (flirty/romantic) require an 18+ check.

import { useState } from "react";
import { loadPrefs, savePrefs } from "@/lib/clientPrefs";
import { LANGUAGES, type ChatIntent, type Language, type Orientation } from "@/lib/prefs";

export const VIBES: { intent: ChatIntent; emoji: string; label: string }[] = [
  { intent: "casual", emoji: "😌", label: "chill" },
  { intent: "friends", emoji: "🤝", label: "friends" },
  { intent: "deep", emoji: "🌊", label: "deep" },
  { intent: "vent", emoji: "😮‍💨", label: "vent" },
  { intent: "flirt", emoji: "😏", label: "flirty" },
  { intent: "love", emoji: "💘", label: "romantic" },
  { intent: "anything", emoji: "🎲", label: "surprise me" },
];

const ORIENTATIONS: { v: Orientation; label: string }[] = [
  { v: "men", label: "men" },
  { v: "women", label: "women" },
  { v: "anyone", label: "anyone" },
];

function isAdult(i: ChatIntent) {
  return i === "flirt" || i === "love";
}

export function VibeSheet({ open, onApplied, onClose }: { open: boolean; onApplied: () => void; onClose: () => void }) {
  const prev = loadPrefs();
  const [intent, setIntent] = useState<ChatIntent>(prev.intent ?? "casual");
  const [language, setLanguage] = useState<Language>(prev.language ?? "english");
  const [into, setInto] = useState<Orientation>(prev.interestedIn ?? "anyone");
  const [age18, setAge18] = useState<boolean>(!!prev.ageConfirmed);

  if (!open) return null;
  const needsAge = isAdult(intent) && !age18;

  function start() {
    if (needsAge) return;
    savePrefs({ ...loadPrefs(), intent, language, interestedIn: into, ageConfirmed: age18 || loadPrefs().ageConfirmed });
    onApplied();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/55" onClick={onClose}>
      <div
        className="sheet-up w-full max-w-md rounded-t-3xl border-t-[2.5px] border-x-[2.5px] border-ink bg-paper-cool px-5 pt-4 pb-7 shadow-hard max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/20" />
        <h3 className="font-sans text-lg font-bold tracking-tight text-ink">set your vibe</h3>

        {/* Vibe */}
        <div className="mt-4 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-2">the vibe</div>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <button
              key={v.intent}
              onClick={() => setIntent(v.intent)}
              className={`rounded-full border-[1.5px] border-ink px-3 py-1.5 font-sans text-[13px] font-bold tracking-tight shadow-hard-xs ${
                intent === v.intent ? "bg-ink text-paper-cool" : "bg-paper-cool text-ink"
              }`}
            >
              {v.emoji} {v.label}
            </button>
          ))}
        </div>

        {/* Language */}
        <div className="mt-5 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-2">chat in</div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="w-full rounded-xl border-2 border-ink bg-paper px-3 py-2.5 font-sans text-[14px] text-ink outline-none"
        >
          {(Object.keys(LANGUAGES) as Language[]).map((k) => (
            <option key={k} value={k}>
              {LANGUAGES[k].label}
            </option>
          ))}
        </select>

        {/* Into */}
        <div className="mt-5 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-2">into</div>
        <div className="flex gap-2">
          {ORIENTATIONS.map((o) => (
            <button
              key={o.v}
              onClick={() => setInto(o.v)}
              className={`flex-1 rounded-xl border-2 border-ink px-3 py-2 font-sans text-[13px] font-bold tracking-tight shadow-hard-xs ${
                into === o.v ? "bg-ink text-paper-cool" : "bg-paper-cool text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* 18+ for adult vibes */}
        {isAdult(intent) && (
          <label className="mt-4 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={age18} onChange={(e) => setAge18(e.target.checked)} className="h-4 w-4 accent-red" />
            <span className="font-sans text-[13px] text-ink-soft">i&apos;m 18 or older</span>
          </label>
        )}

        <button
          onClick={start}
          disabled={needsAge}
          className="mt-5 w-full rounded-xl border-2 border-ink bg-ink px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard disabled:opacity-50"
        >
          {needsAge ? "confirm 18+ to continue" : "start chatting →"}
        </button>
      </div>

      <style jsx>{`
        .sheet-up {
          animation: up 0.28s ease-out;
        }
        @keyframes up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
