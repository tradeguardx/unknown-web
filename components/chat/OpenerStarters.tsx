"use client";

// The "say something first?" empty state. A "set your vibe" button opens a
// slide-up sheet (vibe + language + into); applying re-rolls a matched stranger.
// Then they say hi to start.

import { useState } from "react";
import type { ChatIntent } from "@/lib/prefs";
import { VibeSheet, VIBES } from "./VibeSheet";

export function OpenerStarters({
  onPick,
  currentIntent,
  onReroll,
}: {
  onPick: (text: string) => void;
  currentIntent?: ChatIntent;
  onReroll?: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const currentLabel = VIBES.find((v) => v.intent === currentIntent)?.label;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center text-center">
      <div className="text-ink-mute text-2xl" aria-hidden>
        ⌣
      </div>
      <h2 className="mt-3 font-display text-3xl text-ink">say something first?</h2>
      <p className="mt-2 max-w-[16rem] font-sans text-[13px] leading-relaxed text-ink-mute">
        no names, no history. it vanishes when you leave.
      </p>

      {onReroll && (
        <button
          onClick={() => setSheetOpen(true)}
          className="mt-5 rounded-full border-[1.5px] border-ink bg-paper-cool px-4 py-2 font-sans text-[13px] font-bold tracking-tight text-ink shadow-hard-xs"
        >
          🎚 {currentLabel ? `vibe: ${currentLabel}` : "set your vibe"} ▾
        </button>
      )}

      <div className="mt-5 w-full max-w-sm">
        <button
          onClick={() => onPick("hi 👋")}
          className="relative w-full rounded-2xl border-2 border-ink bg-paper-cool px-5 py-4 shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span
            className="absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 rotate-[-4deg] rounded-[2px] bg-yellow/70 border border-ink/20"
            aria-hidden
          />
          <span className="block font-sans text-lg font-bold tracking-tight text-ink">hi 👋</span>
        </button>
      </div>

      {onReroll && (
        <VibeSheet
          open={sheetOpen}
          onApplied={() => {
            setSheetOpen(false);
            onReroll();
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
