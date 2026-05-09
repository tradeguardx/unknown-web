// Pacing engine — computes a realistic delay before the persona "sends" a message.
// Real humans don't reply instantly, and they don't reply at fixed intervals either.
// Components: thinking pause + typing time (length × persona WPM) + occasional ghost pause.

import type { Persona } from "./persona";

export interface PacingResult {
  // Total ms before delivering the message. Caller should show typing indicator most of this time.
  totalMs: number;
  // Of the totalMs, how long to delay before showing the typing indicator (i.e. "thinking" silently).
  preTypingMs: number;
  // Whether this turn includes a long "got distracted" pause (already included in totalMs).
  ghosted: boolean;
}

export function computePacing(persona: Persona, replyText: string): PacingResult {
  const charCount = replyText.length;
  // Avg ~5 chars/word. Convert WPM to ms-per-char.
  const msPerChar = (60_000 / (persona.wpm * 5));
  const typingMs = Math.round(charCount * msPerChar);

  // "Thinking" pause before they start typing — 0.5s to 4s, longer for longer planned replies.
  const thinkBase = 500 + Math.random() * 1500;
  const thinkScale = Math.min(2500, charCount * 8);
  const preTypingMs = Math.round(thinkBase + Math.random() * thinkScale);

  let totalMs = preTypingMs + typingMs;
  let ghosted = false;

  // Occasional "got distracted by something else" — adds 8–25 extra seconds.
  if (Math.random() < persona.ghostPauseProbability) {
    ghosted = true;
    totalMs += 8_000 + Math.floor(Math.random() * 17_000);
  }

  // Cap at 35s so the UX doesn't feel broken even on a ghost.
  totalMs = Math.min(totalMs, 35_000);

  return { totalMs, preTypingMs, ghosted };
}
