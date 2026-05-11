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

// Per-reply speed roll. Keep most chats in "normal" so the chat feels coherent,
// sprinkle the others so timing isn't predictable.
function rollSpeed(): SpeedMode {
  const r = Math.random();
  if (r < 0.25) return "fast";    // 25% — instant-ish
  if (r < 0.75) return "normal";  // 50% — current behavior
  if (r < 0.90) return "slow";    // 15% — thinking longer / multitasking
  return "on_read";               // 10% — "left you on read, came back later"
}

// Absolute ceiling so the UX never feels permanently broken on a worst roll.
const MAX_TOTAL_MS = 90_000;

export function computePacing(persona: Persona, replyText: string): PacingResult {
  const charCount = replyText.length;
  // Avg ~5 chars/word. Convert WPM to ms-per-char.
  const msPerChar = (60_000 / (persona.wpm * 5));
  const baseTypingMs = Math.round(charCount * msPerChar);

  const mode = rollSpeed();

  let preTypingMs: number;
  let typingMs = baseTypingMs;
  let ghosted = mode === "slow" || mode === "on_read";

  switch (mode) {
    case "fast": {
      // Glance + reflex reply. Almost no thinking, type fast.
      preTypingMs = 200 + Math.floor(Math.random() * 1_500);
      // Speed up typing too — they didn't think, they just blurted.
      typingMs = Math.round(baseTypingMs * 0.7);
      break;
    }
    case "normal": {
      // Existing behavior: 0.5–4s think, scaled slightly by reply length.
      const thinkBase = 500 + Math.random() * 1500;
      const thinkScale = Math.min(2500, charCount * 8);
      preTypingMs = Math.round(thinkBase + Math.random() * thinkScale);
      break;
    }
    case "slow": {
      // Thinking longer / multitasking / they got pulled away briefly.
      // 15–30s silent pause, then normal typing.
      preTypingMs = 15_000 + Math.floor(Math.random() * 15_000);
      break;
    }
    case "on_read": {
      // "Left you on read." Long silent pause with NO typing indicator,
      // then a short typing burst, then a (usually short) reply. Client uses
      // the mode flag to decide whether to suppress the typing indicator for
      // most of preTypingMs.
      preTypingMs = 40_000 + Math.floor(Math.random() * 20_000);
      // After being on read, typing is brief (~3–8s).
      typingMs = Math.min(baseTypingMs, 3_000 + Math.floor(Math.random() * 5_000));
      break;
    }
  }

  // Persona-level "got distracted by something else" — kept as an additive layer
  // on top of the speed mode for normal/fast (slow/on_read already model this).
  if (!ghosted && Math.random() < persona.ghostPauseProbability) {
    ghosted = true;
    preTypingMs += 8_000 + Math.floor(Math.random() * 17_000);
  }

  const totalMs = Math.min(preTypingMs + typingMs, MAX_TOTAL_MS);
  return { totalMs, preTypingMs: Math.min(preTypingMs, totalMs), ghosted, mode };
}
