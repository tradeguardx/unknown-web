// Parses a raw model reply into:
//   - one or more text messages (split on newlines — the prompt tells Claude to use \n
//     between consecutive bursts)
//   - leave / stay sentinels: [LEAVE: reason], [STAY]
//
// The split-on-newline pattern lets the persona send 2 short messages in a row
// (one of the things real strangers do that one-shot LLM replies can't naturally do).

import { computePacing } from "./pacing";
import type { Persona } from "./persona";

const LEAVE_RE = /\[LEAVE(?::\s*([^\]]*))?\]/i;
const STAY_RE = /\[STAY\]/i;

export interface PacedMessage {
  text: string;
  // ms before this message starts (relative to the previous message's end, or session start if first)
  preTypingMs: number;
  // total ms this message takes from "start" to "delivered" (prefix + typing time)
  totalMs: number;
}

export interface ParsedReply {
  messages: PacedMessage[]; // empty if STAY or pure-LEAVE-no-text
  left: boolean;
  leaveReason?: string;
  stay: boolean;
}

export function parseReply(persona: Persona, raw: string): ParsedReply {
  const stay = STAY_RE.test(raw);

  let leftMatch = raw.match(LEAVE_RE);
  let left = !!leftMatch;
  const leaveReason = leftMatch?.[1]?.trim() || (left ? "left" : undefined);

  let cleaned = raw.replace(LEAVE_RE, "").replace(STAY_RE, "").trim();

  if (stay) {
    return { messages: [], left: false, stay: true };
  }

  if (!cleaned) {
    return { messages: [], left, leaveReason, stay: false };
  }

  // Split on newlines, but cap at 3 messages and drop empties.
  // Some models also use double-newlines or weird spacing — normalize.
  // Also: Claude occasionally emits the LITERAL two-character sequence "\n"
  // (backslash + n) instead of a real newline — convert those before splitting.
  const chunks = cleaned
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const messages: PacedMessage[] = chunks.map((text, idx) => {
    const pacing = computePacing(persona, text);
    if (idx === 0) {
      return { text, preTypingMs: pacing.preTypingMs, totalMs: pacing.totalMs };
    }
    // Follow-up bursts have a short gap (0.6s–2.5s) before they start, then a full pacing cycle.
    const followGap = 600 + Math.floor(Math.random() * 1900);
    return {
      text,
      preTypingMs: followGap,
      totalMs: followGap + pacing.totalMs - pacing.preTypingMs,
    };
  });

  return { messages, left, leaveReason, stay: false };
}
