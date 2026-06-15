"use client";

// Full vibe-picker popup. Opened from the opener screen's "set a vibe" button.
// Picking a vibe re-rolls a stranger matched to that mood.

import type { ChatIntent } from "@/lib/prefs";

export const VIBES: { intent: ChatIntent; emoji: string; label: string; desc: string }[] = [
  { intent: "casual", emoji: "😌", label: "chill", desc: "easy, low-key talk" },
  { intent: "friends", emoji: "🤝", label: "make a friend", desc: "just vibe, no agenda" },
  { intent: "deep", emoji: "🌊", label: "deep", desc: "real, meaningful talk" },
  { intent: "vent", emoji: "😮‍💨", label: "vent", desc: "get something off your chest" },
  { intent: "flirt", emoji: "😏", label: "flirty", desc: "playful, a little spicy" },
  { intent: "love", emoji: "💘", label: "romantic", desc: "looking for a real connection" },
  { intent: "anything", emoji: "🎲", label: "surprise me", desc: "open to whatever" },
];

export function VibePicker({
  open,
  current,
  onSelect,
  onClose,
}: {
  open: boolean;
  current?: ChatIntent;
  onSelect: (intent: ChatIntent) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/55 px-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border-[2.5px] border-ink bg-paper-cool p-5 shadow-hard max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-sans text-lg font-bold tracking-tight text-ink">
            what are you in the mood for?
          </h3>
          <button onClick={onClose} aria-label="close" className="text-ink-mute hover:text-ink p-1">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l12 12M17 5L5 17" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {VIBES.map((v) => {
            const active = current === v.intent;
            return (
              <button
                key={v.intent}
                onClick={() => onSelect(v.intent)}
                className={`w-full flex items-center gap-3 rounded-2xl border-2 border-ink px-4 py-3 text-left shadow-hard-xs ${
                  active ? "bg-lilac/40" : "bg-paper-cool hover:bg-paper-warm"
                }`}
              >
                <span className="text-2xl flex-shrink-0">{v.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[15px] font-bold tracking-tight text-ink">{v.label}</span>
                  <span className="block font-sans text-[12px] text-ink-mute">{v.desc}</span>
                </span>
                {active && <span className="flex-shrink-0 text-ink font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
