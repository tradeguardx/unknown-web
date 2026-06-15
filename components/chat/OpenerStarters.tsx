"use client";

// The "say something first?" empty state. Shown when the user has connected to a
// stranger who did NOT open first. Lets them optionally SET A VIBE (re-rolls the
// stranger to match the chosen mood) and then say hi to start.

import type { ChatIntent } from "@/lib/prefs";

const VIBES: { label: string; intent: ChatIntent }[] = [
  { label: "chill", intent: "casual" },
  { label: "flirty", intent: "flirt" },
  { label: "deep", intent: "deep" },
  { label: "friendly", intent: "friends" },
  { label: "vent", intent: "vent" },
];

export function OpenerStarters({
  onPick,
  currentIntent,
  onSetVibe,
}: {
  onPick: (text: string) => void;
  currentIntent?: ChatIntent;
  onSetVibe?: (intent: ChatIntent) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center text-center">
      <div className="text-ink-mute text-2xl" aria-hidden>
        ⌣
      </div>
      <h2 className="mt-3 font-display text-3xl text-ink">say something first?</h2>
      <p className="mt-2 max-w-[16rem] font-sans text-[13px] leading-relaxed text-ink-mute">
        no names, no history. it vanishes when you leave.
      </p>

      {/* Set a vibe — re-rolls the stranger to match the chosen mood. */}
      {onSetVibe && (
        <div className="mt-6 w-full max-w-sm">
          <div className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-2">
            set a vibe
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {VIBES.map((v) => (
              <button
                key={v.intent}
                onClick={() => onSetVibe(v.intent)}
                className={`rounded-full border-[1.5px] border-ink px-3 py-1.5 font-sans text-[13px] font-bold tracking-tight shadow-hard-xs ${
                  currentIntent === v.intent ? "bg-ink text-paper-cool" : "bg-paper-cool text-ink"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 w-full max-w-sm">
        <button
          onClick={() => onPick("hi 👋")}
          className="relative w-full rounded-2xl border-2 border-ink bg-paper-cool px-5 py-4 shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {/* little tape strip */}
          <span
            className="absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 rotate-[-4deg] rounded-[2px] bg-yellow/70 border border-ink/20"
            aria-hidden
          />
          <span className="block font-sans text-lg font-bold tracking-tight text-ink">hi 👋</span>
        </button>
      </div>
    </div>
  );
}
