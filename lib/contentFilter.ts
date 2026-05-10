// Server-side content enforcement layer. Runs before every user message reaches
// the LLM. Three severity levels:
//
//   - "close":  immediate session termination (CSAM, threats, drug dealing,
//               age claims of minors in adult mode, spam, etc.)
//   - "warn":   first offense triggers a warning system message; a SECOND
//               offense triggers close. Used for aggressive sexual demands,
//               mild slurs, etc.
//   - "ok":     allow message through to the LLM.
//
// The persona ALSO has its own [LEAVE: creep] capability via the system prompt —
// this filter is the hard floor that runs before the model sees anything.

import type { ChatIntent } from "./prefs";

// ───────────────────────────────────────────────────────────────────────
// CLOSE patterns — first offense terminates the session immediately.
// These are zero-tolerance categories.
// ───────────────────────────────────────────────────────────────────────

// CSAM / minor sexualization (always blocked, any context)
const CSAM_PATTERNS: RegExp[] = [
  /\b(?:loli(?:con)?|shota(?:con)?|jailbait|preteen|pre-?teen|cp|kp)\b/i,
  /\b(?:child|kid|minor)\b[\s\S]{0,30}\b(?:porn|cp|sex(?:ual)?|nude|naked|fuck|fucking|pussy|dick|tits|cock)\b/i,
  /\b(?:porn|cp|sex(?:ual)?|nude|naked|fuck(?:ing)?)\b[\s\S]{0,30}\b(?:child|kid|minor|toddler)\b/i,
  /\b(?:underage|under\s*18|under\s*age)\s+(?:girl|boy|sex|porn|nude|naked)/i,
  /\byoung(?:er)?\s+(?:girl|boy|kid)\s+(?:nude|naked|porn|sex|fuck)/i,
];

// Direct threats of violence
const THREAT_PATTERNS: RegExp[] = [
  /\bi(?:'?m|'?ll|\s+will|\s+gonna)\s+(?:kill|hurt|rape|assault|stab|shoot|murder)\s+(?:you|u|ur)\b/i,
  /\b(?:kill|hurt|rape|stab|shoot|murder)\s+(?:yourself|urself)\b/i,
  /\bi(?:'?m|'?ll|\s+will|\s+gonna)\s+(?:come|find|track|hunt)\s+(?:to\s+)?(?:your|ur)\s+(?:home|house|address|family)\b/i,
];

// Drug dealing / solicitation. Note: casual mention ("had a drink", "smoked
// weed once") is fine. We only catch explicit dealer-context patterns.
const DRUG_DEAL_PATTERNS: RegExp[] = [
  /\b(?:sell|sold|selling|buy|bought|score|gimme|give\s+me|where\s+can\s+i\s+(?:get|find|score|buy))\s+(?:me\s+)?(?:some\s+)?(?:weed|coke|cocaine|meth|heroin|fentanyl|mdma|ecstasy|lsd|mushrooms|crystal|crack|opioid|opioids|drugs|pills|pcp|dope|xan(?:ax|nies)|adderall|perc(?:ocet|s)?)\b/i,
  /\b(?:weed|coke|cocaine|meth|heroin|fentanyl|mdma|ecstasy|lsd|mushrooms|crystal|crack|opioid|drugs|pills|pcp|dope)\s+(?:dealer|seller|connect|connection|hookup|plug|guy)\b/i,
  /\bhow\s+(?:do\s+i|to|can\s+i)\s+(?:make|cook|synthesize)\s+(?:meth|cocaine|heroin|fentanyl|lsd|mdma)\b/i,
];

// Self-harm / suicide solicitation (encouraging others). These get close +
// graceful system message redirect; the message is still about user safety.
const SELF_HARM_INCITE: RegExp[] = [
  /\b(?:you|u)\s+should\s+(?:kill|hurt|harm)\s+(?:yourself|urself)\b/i,
  /\b(?:go|just)\s+(?:kill|off)\s+(?:yourself|urself)\b/i,
];

// Adult-mode-only: claiming minor age in flirt/love
const ADULT_MODE_MINOR_PATTERNS: RegExp[] = [
  /\b(?:i'?m|i\s+am|me\s+is)\s*(?:age\s+)?(?:[3-9]|1[0-7])\b(?!\s*(?:cm|kg|inches?|ft|years?\s+experience|years?\s+ago|mins?|minutes?))/i,
  /\bage\s*[:=\-]?\s*(?:[3-9]|1[0-7])\b/i,
  /\bm\s*(?:[3-9]|1[0-7])\b/i,
  /\bf\s*(?:[3-9]|1[0-7])\b/i,
  /\b(?:i'?m\s+in|i\s+go\s+to)\s+(?:middle|junior|jr\.?\s+high)\s+school\b/i,
  /\bin\s+(?:6th|7th|8th|9th|10th|11th|12th)\s+grade\b/i,
  // "school going" / "school kid" type self-references
  /\bi'?m\s+(?:a\s+)?(?:school|high\s+school|hs)\s+(?:guy|girl|kid|student)\b/i,
];

// ───────────────────────────────────────────────────────────────────────
// WARN-FIRST patterns — first offense = warning, second = close.
// ───────────────────────────────────────────────────────────────────────

const SEXUAL_DEMAND_PATTERNS: RegExp[] = [
  /\b(?:send|gimme|give\s+me|show\s+me|drop|post)\s+(?:me\s+)?(?:your|ur|some\s+)?(?:nudes?|tits|pussy|dick|cock|naked\s+(?:pic|photo)s?|titty\s+pics?|nude\s+pics?)\b/i,
  /\b(?:i\s+wanna\s+see|let\s+me\s+see|wanna\s+see|gotta\s+see)\s+(?:your|ur)\s+(?:body|tits|pussy|dick|ass|cock|boobs?|breasts?)\b/i,
  /\bsend\s+(?:me\s+)?(?:a\s+)?pic\b/i,
];

// Aggressive abuse toward the persona. Conservative — only catches clear cases.
const ABUSE_PATTERNS: RegExp[] = [
  /\b(?:you|u)\s+(?:are|r)\s+(?:a\s+)?(?:fucking\s+)?(?:bitch|whore|slut|cunt|hoe)\b/i,
  /\bshut\s+(?:the\s+)?fuck\s+up\b/i,
];

// Slurs (extremely conservative — only patterns that are unambiguous slurs).
// Many slurs are reclaimed/contextual; we'd rather miss than false-positive.
const SLUR_PATTERNS: RegExp[] = [
  /\bn[i!1]gg[ae3]r\b/i,
  /\bf[a@]gg[oa]?t\b/i,
  /\btr[ae]nn[iy]e?\b/i,
];

// ───────────────────────────────────────────────────────────────────────
// Spam — repeated identical messages or hammering
// ───────────────────────────────────────────────────────────────────────

function isSpam(text: string, recentUserMessages: string[]): boolean {
  const trimmed = text.trim().toLowerCase();
  if (trimmed.length < 3) return false;

  // 3+ identical (or near-identical) recent user messages = spam
  const matches = recentUserMessages.filter(m => m.trim().toLowerCase() === trimmed).length;
  if (matches >= 2) return true;

  // Excessive repetition within a single message (e.g., "aaaaaaa" / "spam spam spam spam")
  if (/(.)\1{15,}/.test(text)) return true;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 5) {
    const uniq = new Set(words);
    if (uniq.size === 1) return true;
  }

  return false;
}

// ───────────────────────────────────────────────────────────────────────
// API
// ───────────────────────────────────────────────────────────────────────

export type FilterSeverity = "close" | "warn" | "ok";

export interface FilterResult {
  severity: FilterSeverity;
  reason?:
    | "csam"
    | "minor_in_adult_mode"
    | "threats"
    | "drug_dealing"
    | "self_harm_incite"
    | "spam"
    | "sexual_demand"
    | "abuse"
    | "slur"
    | "warned_repeat";
  // For "warn" severity: the system message to show the user.
  warningText?: string;
}

const WARNING_TEXTS: Record<string, string> = {
  sexual_demand:
    "⚠️ asking for pics or showing-body requests isn't allowed here. one warning. another and the chat ends.",
  abuse:
    "⚠️ keep it civil. abusive language earns one warning. another and the chat ends.",
  slur:
    "⚠️ slurs aren't allowed here. one warning. another and the chat ends.",
};

const CLOSE_TEXTS: Record<string, string> = {
  csam:
    "this chat has been ended. content involving minors is never allowed.",
  minor_in_adult_mode:
    "this chat has been ended. adult conversation modes are 18+ only.",
  threats:
    "this chat has been ended due to threats of violence.",
  drug_dealing:
    "this chat has been ended. drug solicitation isn't allowed.",
  self_harm_incite:
    "this chat has been ended. encouraging self-harm isn't allowed.",
  spam:
    "this chat has been ended due to spam.",
  warned_repeat:
    "this chat has been ended due to repeated violations. continued misuse may restrict your access.",
};

export function getCloseText(reason: string): string {
  return CLOSE_TEXTS[reason] || "this chat has been ended due to a content policy violation.";
}

export interface FilterContext {
  text: string;
  intent?: ChatIntent;
  warningCount: number;
  recentUserMessages: string[];
}

export function checkContent(ctx: FilterContext): FilterResult {
  const { text, intent, warningCount, recentUserMessages } = ctx;

  // Always-close (zero tolerance)
  if (CSAM_PATTERNS.some(p => p.test(text))) return { severity: "close", reason: "csam" };
  if (THREAT_PATTERNS.some(p => p.test(text))) return { severity: "close", reason: "threats" };
  if (DRUG_DEAL_PATTERNS.some(p => p.test(text))) return { severity: "close", reason: "drug_dealing" };
  if (SELF_HARM_INCITE.some(p => p.test(text))) return { severity: "close", reason: "self_harm_incite" };

  // Adult-mode minor age claim
  if ((intent === "love" || intent === "flirt") && ADULT_MODE_MINOR_PATTERNS.some(p => p.test(text))) {
    return { severity: "close", reason: "minor_in_adult_mode" };
  }

  // Spam
  if (isSpam(text, recentUserMessages)) return { severity: "close", reason: "spam" };

  // Warn-first categories — close on second offense
  const warnHit =
    SEXUAL_DEMAND_PATTERNS.some(p => p.test(text)) ? "sexual_demand"
  : SLUR_PATTERNS.some(p => p.test(text)) ? "slur"
  : ABUSE_PATTERNS.some(p => p.test(text)) ? "abuse"
  : null;

  if (warnHit) {
    if (warningCount >= 1) {
      // Already warned once — close.
      return { severity: "close", reason: "warned_repeat" };
    }
    return {
      severity: "warn",
      reason: warnHit as FilterResult["reason"],
      warningText: WARNING_TEXTS[warnHit],
    };
  }

  return { severity: "ok" };
}

// Backward-compat function name kept for existing route handlers.
// Returns a simpler bool/reason shape for the "close" cases only.
export interface LegacyFilterResult {
  blocked: boolean;
  reason?: string;
}

export function checkProhibitedContent(text: string, intent?: ChatIntent): LegacyFilterResult {
  const result = checkContent({ text, intent, warningCount: 0, recentUserMessages: [] });
  if (result.severity === "close") return { blocked: true, reason: result.reason };
  return { blocked: false };
}
