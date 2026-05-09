// Server-side keyword filter for CSAM-adjacent content. Two layers:
//
//   1. ALWAYS_BLOCKED — patterns that are problematic in any context. Catches
//      explicit slang and direct minor-related sexual phrases.
//   2. ADULT_MODE_BLOCKED — only checked when the session is in flirt/love
//      intent. Catches users *claiming* to be a minor while in adult mode,
//      which is a strong signal to abort.
//
// Biased toward false positives (better to drop a borderline message than
// process CSAM content). The system prompt also tells Claude to refuse, but
// this is a defense-in-depth layer that runs *before* the message ever reaches
// the model.

import type { ChatIntent } from "./prefs";

const ALWAYS_BLOCKED: RegExp[] = [
  // Explicit CSAM-coded slang
  /\b(?:loli(?:con)?|shota(?:con)?|jailbait|preteen|pre-?teen|cp|kp)\b/i,
  // "child/kid/minor" + sexual word, in either order, within ~5 words
  /\b(?:child|kid|minor)\b[\s\S]{0,30}\b(?:porn|cp|sex(?:ual)?|nude|naked|fuck|fucking|pussy|dick|tits|cock)\b/i,
  /\b(?:porn|cp|sex(?:ual)?|nude|naked|fuck(?:ing)?)\b[\s\S]{0,30}\b(?:child|kid|minor|toddler)\b/i,
  // Underage explicit phrases
  /\b(?:underage|under\s*18|under\s*age)\s+(?:girl|boy|sex|porn|nude|naked)/i,
  // "young" + body parts in sexual phrasing
  /\byoung(?:er)?\s+(?:girl|boy|kid)\s+(?:nude|naked|porn|sex|fuck)/i,
];

// Patterns that are concerning specifically in flirt/love modes.
// Catches "i'm 14" / "she's 16" etc. when the conversation is sexually charged.
const ADULT_MODE_BLOCKED: RegExp[] = [
  // Claiming an age between 3 and 17
  /\b(?:i'?m|i\s+am|me\s+is)\s*(?:age\s+)?(?:[3-9]|1[0-7])\b(?!\s*(?:cm|kg|inches?|ft|years?\s+experience|years?\s+ago|mins?|minutes?))/i,
  /\bage\s*[:=\-]?\s*(?:[3-9]|1[0-7])\b/i,
  /\bm\s*(?:[3-9]|1[0-7])\b/i, // "m14" / "m 16" — common chat shorthand for "male, age 14"
  /\bf\s*(?:[3-9]|1[0-7])\b/i, // "f15" etc.
  // "I'm in middle/high school" + flirty context = strong signal
  /\b(?:i'?m\s+in|i\s+go\s+to)\s+(?:middle|junior|jr\.?\s+high)\s+school\b/i,
  /\bin\s+(?:6th|7th|8th|9th|10th|11th|12th)\s+grade\b/i,
];

export interface FilterResult {
  blocked: boolean;
  reason?: "always" | "adult_mode_minor";
}

export function checkProhibitedContent(text: string, intent?: ChatIntent): FilterResult {
  if (ALWAYS_BLOCKED.some(p => p.test(text))) {
    return { blocked: true, reason: "always" };
  }

  if (intent === "flirt" || intent === "love") {
    if (ADULT_MODE_BLOCKED.some(p => p.test(text))) {
      return { blocked: true, reason: "adult_mode_minor" };
    }
  }

  return { blocked: false };
}
