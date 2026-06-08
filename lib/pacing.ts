// Pacing engine — computes a realistic delay before the persona "sends" a message.
// Real humans don't reply instantly, and they don't reply at fixed intervals either.
// Components: thinking pause + typing time (length × persona WPM) + occasional
// speed-mode (fast burst / slow think / "left on read" pattern).
//
// Speed mode is rolled PER REPLY (not per persona) so the same persona shows
// timing variance within one chat — which is exactly what real people do.
// Some replies fire in 2s; some land 60s later. That irregularity is the most
// reliable "this isn't a bot" signal we can fake.

import type { Persona } from "./persona";

export interface PacingResult {
  // Total ms before delivering the message. Caller should show typing indicator most of this time.
  totalMs: number;
  // Of the totalMs, how long to delay before showing the typing indicator (i.e. "thinking" silently).
  preTypingMs: number;
  // Whether this turn includes a long "got distracted" pause (already included in totalMs).
  ghosted: boolean;
  // The mode this reply rolled — useful for the client to know whether to skip
  // the typing indicator for most of the wait (on_read pattern).
  mode: SpeedMode;
}

export type SpeedMode = "fast" | "normal" | "slow" | "on_read";

// Per-reply speed roll. LENGTH is the primary driver of typing time (handled in
// computePacing); the mode only adds human variance to the *thinking* pause and
// nudges typing speed. Keep most replies snappy — the rare slow/on_read modes
// are what used to make chats feel randomly "too slow", so they're now rarer
// and gentler.
function rollSpeed(): SpeedMode {
  const r = Math.random();
  if (r < 0.30) return "fast";    // 30% — reflex reply, barely a pause
  if (r < 0.88) return "normal";  // 58% — normal thinking pause
  if (r < 0.97) return "slow";    // 9%  — thinking longer / multitasking
  return "on_read";               // 3%  — "left you on read, came back"
}

// Absolute ceiling so the UX never feels permanently broken on a worst roll.
const MAX_TOTAL_MS = 60_000;
// Floor on the WHOLE response. Instant replies are the #1 "this is a bot" tell —
// users have called it out — so even a reflex reply takes a human beat to land.
const MIN_TOTAL_MS = 1_600;
// Typing-time guardrails. A 1–2 word reply still shows a brief, believable type;
// a long reply never drags past this.
const MIN_TYPING_MS = 600;
const MAX_TYPING_MS = 11_000;

export function computePacing(persona: Persona, replyText: string): PacingResult {
  const text = replyText.trim();
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length || 1;

  // Texting cadence (chars/min). Real chat typing is burstier and faster than
  // prose WPM — people fire off short texts. We derive a per-char cost from the
  // persona's wpm in this texting register so LENGTH drives the time: few words
  // → quick to send, many words → visibly longer.
  const charsPerMin = persona.wpm * 11;            // wpm 35 → ~385cpm, wpm 50 → ~550cpm
  const msPerChar = 60_000 / charsPerMin;          // wpm 35 → ~156ms, wpm 50 → ~109ms
  // Length-driven typing time, clamped at both ends.
  const baseTypingMs = Math.min(
    MAX_TYPING_MS,
    Math.max(MIN_TYPING_MS, Math.round(charCount * msPerChar)),
  );

  // Think time scales gently with length too — a one-liner barely needs a pause,
  // a longer reply implies a beat of composing first.
  const lengthThink = Math.min(2_000, wordCount * 120);

  const mode = rollSpeed();

  let preTypingMs: number;
  let typingMs = baseTypingMs;
  let ghosted = mode === "slow" || mode === "on_read";

  switch (mode) {
    case "fast": {
      // Glance + reflex reply. Quick, but NOT instant — a real person still
      // takes ~1s to read and start typing. Types a touch quicker but stays
      // proportional to length (a long "fast" reply isn't instant).
      preTypingMs = 500 + Math.floor(Math.random() * 1_200);
      typingMs = Math.round(baseTypingMs * 0.85);
      break;
    }
    case "normal": {
      // Short, length-aware think pause.
      const thinkBase = 400 + Math.random() * 1_200;
      preTypingMs = Math.round(thinkBase + Math.random() * lengthThink);
      break;
    }
    case "slow": {
      // Thinking longer / multitasking / briefly pulled away. Gentler than
      // before (used to be 15–30s, which read as "broken").
      preTypingMs = 6_000 + Math.floor(Math.random() * 8_000);
      break;
    }
    case "on_read": {
      // "Left you on read." A silent pause with NO typing indicator, then a
      // short typing burst. Trimmed from 40–60s to keep it human, not dead.
      preTypingMs = 16_000 + Math.floor(Math.random() * 16_000);
      typingMs = Math.min(baseTypingMs, 2_500 + Math.floor(Math.random() * 4_000));
      break;
    }
  }

  // Persona-level "got distracted by something else" — an occasional additive
  // pause on otherwise-snappy replies (slow/on_read already model this).
  if (!ghosted && Math.random() < persona.ghostPauseProbability) {
    ghosted = true;
    preTypingMs += 6_000 + Math.floor(Math.random() * 12_000);
  }

  const totalMs = Math.min(
    Math.max(preTypingMs + typingMs, MIN_TOTAL_MS),
    MAX_TOTAL_MS,
  );
  return { totalMs, preTypingMs: Math.min(preTypingMs, totalMs), ghosted, mode };
}
