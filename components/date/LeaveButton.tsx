"use client";

// A discreet "leave the date" control for the immersive (dark) date screens.
// Two-tap confirm so nobody abandons a date by a stray tap.

import { useState } from "react";

export function LeaveButton({ onLeave }: { onLeave: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      onClick={() => (confirm ? onLeave() : setConfirm(true))}
      onBlur={() => setConfirm(false)}
      title="leave the date"
      className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-sans text-[12px] font-bold text-paper-cool hover:bg-white/20"
    >
      {confirm ? "leave? tap again" : "✕ leave"}
    </button>
  );
}
