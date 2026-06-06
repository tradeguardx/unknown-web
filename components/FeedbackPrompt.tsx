"use client";

import { useState } from "react";

const FACES: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😡", label: "awful" },
  { value: 2, emoji: "😕", label: "meh" },
  { value: 3, emoji: "😐", label: "okay" },
  { value: 4, emoji: "🙂", label: "good" },
  { value: 5, emoji: "😍", label: "loved it" },
];

// Post-chat feedback: an emoji rating + an optional written review.
// Parent decides WHEN to show this (e.g. chats ≥ 5 min, not asked recently).
export function FeedbackPrompt({
  onSubmit,
  onSkip,
}: {
  onSubmit: (rating: number, text: string) => void;
  onSkip: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mx-5 my-3 rounded-2xl border-2 border-ink bg-yellow px-4 py-3 text-center shadow-hard-sm">
        <span className="font-display text-base font-bold text-ink">thanks for the feedback! 💛</span>
      </div>
    );
  }

  function submit() {
    if (rating === null) return;
    setSent(true);
    onSubmit(rating, text.trim());
  }

  return (
    <div className="mx-5 my-3 rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-base font-bold text-ink">how was that chat?</span>
        <button
          onClick={onSkip}
          className="font-sans text-xs font-bold text-ink-mute hover:text-ink"
        >
          skip
        </button>
      </div>

      {/* Emoji rating */}
      <div className="flex justify-between gap-1">
        {FACES.map((f) => (
          <button
            key={f.value}
            onClick={() => setRating(f.value)}
            title={f.label}
            aria-label={f.label}
            className={`flex-1 rounded-xl border-2 py-2 text-2xl transition-transform ${
              rating === f.value
                ? "border-ink bg-yellow scale-110 shadow-hard-xs"
                : "border-transparent hover:scale-110"
            }`}
          >
            {f.emoji}
          </button>
        ))}
      </div>

      {/* Optional written review — appears once a face is picked */}
      {rating !== null && (
        <div className="mt-3 flex gap-1.5">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            maxLength={1000}
            placeholder="add a review… (optional)"
            className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-paper px-3 py-2 font-mono text-[13px] text-ink outline-none placeholder:font-serif placeholder:italic placeholder:text-ink-mute"
          />
          <button
            onClick={submit}
            className="flex-shrink-0 rounded-xl border-none bg-ink px-4 py-2 font-sans text-xs font-bold text-paper"
          >
            send
          </button>
        </div>
      )}
    </div>
  );
}
