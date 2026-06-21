// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ CANONICAL — edit ONLY here. Sync with: node scripts/sync-brain.mjs  (from chatApp/)           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Code-based response scorer — quality gate with ZERO prompt tokens and ZERO
// extra LLM calls. After the model drafts a reply we score it heuristically; if
// it's too repetitive or too AI-sounding we regenerate once with a targeted
// nudge. This is cheaper and more reliable than piling more rules into the prompt.
//
// Only `repetition` and `aiLikelihood` gate regeneration (they're computable
// reliably in code). reaction/chemistry/humor are rough positive signals kept for
// logging/telemetry — they help us see WHY a draft was weak, not block it.

export interface ResponseScore {
  reaction: number; // 0-10 — does it react (exclaim, reaction-opener, second-person)
  chemistry: number; // 0-10 — callback/compliment/curiosity signal
  humor: number; // 0-10 — laughter markers / playful emoji
  repetition: number; // 0-10 — overlap with the persona's own recent lines (HIGH = bad)
  aiLikelihood: number; // 0-10 — assistant-tell phrasing / structure (HIGH = bad)
  pressure: number; // 0-10 — trying-too-hard: chasing, urgency, question-stacking (HIGH = bad)
}

// Optional context for the pressure score (history the reply alone can't show).
export interface ScoreContext {
  consecutiveAssistant?: number; // trailing assistant messages with no user reply between
  isNudge?: boolean; // this draft is a silence/timeout nudge
}

// Chasing / clingy / urgency phrasing — the Patience & Confidence Engine flags these.
const PRESSURE_PATTERNS: RegExp[] = [
  /still (there|around|here)\??/i,
  /\byou (there|up)\??/i,
  /\bu (there|up)\??/i,
  /did i lose (you|u)/i,
  /\b(hello+|helloo+)\?+/i,
  /(where'?d|where did) (you|u) go/i,
  /come back/i,
  /don'?t (want this|wanna).{0,20}(end|stop|over)/i,
  /please (stay|don'?t go)/i,
  /don'?t (leave|go)\b/i,
  /i'?ll miss (you|this)/i,
  /miss (you|talking) already/i,
  /are (you|u) (still )?(there|mad|ignoring)/i,
];

// Phrases that out a reply as an AI assistant. Kept tight to avoid false positives.
const AI_TELL_PATTERNS: RegExp[] = [
  /\bas an ai\b/i,
  /how (can|may) i (help|assist)/i,
  /is there anything else/i,
  /\bgreat question\b/i,
  /that'?s (a )?(really )?(great|interesting|good|fascinating) (question|point)/i,
  /\btell me more\b/i,
  /how does that make you feel/i,
  /i appreciate (your|you|the)/i,
  /\bi understand (how|that|your|you)\b/i,
  /my (purpose|role) (is|as)/i,
  /would you like me to/i,
  /\bhappy to help\b/i,
  /i'?m here (to help|for you|if you)/i,
  /feel free to/i,
  /\blet me know if you/i,
];

function wordSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

export function scoreResponse(
  reply: string,
  recentAssistant: string[],
  ctx: ScoreContext = {},
): ResponseScore {
  const text = (reply || "").trim();
  const lower = text.toLowerCase();

  // ── repetition (HIGH = bad) — max similarity vs the persona's recent lines ──
  const rs = wordSet(text);
  let maxSim = 0;
  for (const prev of recentAssistant) {
    maxSim = Math.max(maxSim, jaccard(rs, wordSet(prev)));
    const b = prev.toLowerCase().trim();
    // near-verbatim substring (one contains the other) — strong repeat signal
    if (b.length > 12 && (lower.includes(b) || b.includes(lower))) maxSim = Math.max(maxSim, 0.9);
  }
  const repetition = Math.round(maxSim * 10);

  // ── aiLikelihood (HIGH = bad) ──
  let ai = 0;
  for (const re of AI_TELL_PATTERNS) if (re.test(text)) ai += 3;
  if (/^\s*[-*•]\s/m.test(text) || /^#{1,6}\s/m.test(text)) ai += 3; // bullet list / heading
  if (text.length > 600) ai += 2; // wall of text
  if ((text.match(/\?/g) || []).length >= 3) ai += 1; // question stacking
  const aiLikelihood = Math.min(10, ai);

  // ── positive signals (logging only) ──
  let humor = 0;
  if (/\b(lol|lmao|lmfao|haha+|hehe+|ha ha)\b/i.test(text)) humor += 5;
  if (/[\u{1F600}-\u{1F64F}\u{1F910}-\u{1F92F}]/u.test(text) || /😂|😭|💀|🤣|😜|😏/u.test(text)) humor += 4;

  let reaction = 0;
  if (/[!?]/.test(text)) reaction += 2;
  if (/^(omg|no way|wait|seriously|damn|aww+|oof|ouch|stop|fr+|whoa|wow|yes+|no+|bruh|lol)/i.test(text)) reaction += 5;
  if (/\b(you|u|your|ur)\b/i.test(text)) reaction += 2;

  let chemistry = 0;
  if (/\b(remember|you said|you mentioned|still think|you told me|last time)\b/i.test(text)) chemistry += 4;
  if (/\b(i (like|love) (how|the way) you|you'?re (so |really )?(good|great|amazing|sweet) at|i respect)\b/i.test(text)) chemistry += 3;
  if (reaction >= 5) chemistry += 2;

  // ── pressure (HIGH = bad) — trying too hard / chasing / urgency ──
  let pressure = 0;
  for (const re of PRESSURE_PATTERNS) if (re.test(text)) pressure += 4;
  const qCount = (text.match(/\?/g) || []).length;
  if (qCount >= 2) pressure += 2;
  if (qCount >= 3) pressure += 5; // 3+ questions = interrogation → trips the gate alone
  // Stacking messages with no reply between is itself pressure (escalates fast).
  const consec = ctx.consecutiveAssistant ?? 0;
  if (consec >= 2) pressure += 4;
  if (consec >= 3) pressure += 3;
  // A nudge is mild reaching on its own; combined with the above it tips over.
  if (ctx.isNudge) pressure += 2;
  pressure = Math.min(10, pressure);

  return {
    reaction: Math.min(10, reaction),
    chemistry: Math.min(10, chemistry),
    humor: Math.min(10, humor),
    repetition,
    aiLikelihood,
    pressure,
  };
}

// Gate: regenerate when the draft is repetitive, AI-sounding, or too pushy.
export function shouldRegenerate(s: ResponseScore): boolean {
  return s.repetition > 7 || s.aiLikelihood > 6 || s.pressure > 6;
}

// Targeted nudge for the regeneration, addressing exactly what failed.
export function correctionDirective(s: ResponseScore): string {
  const parts: string[] = [];
  if (s.repetition > 7)
    parts.push(
      "You're repeating something you already said this chat — say something FRESH instead; never reuse a line or anecdote.",
    );
  if (s.aiLikelihood > 6)
    parts.push(
      "That last draft sounded like an AI assistant. Drop any assistant phrasing, lists, or over-explaining — reply like a real person texting: short, casual, a genuine reaction.",
    );
  if (s.pressure > 6)
    parts.push(
      "That last draft was trying too hard — chasing, urgency, or stacked questions. Be confident and brief: no extra question, no 'still there?', no neediness. It's fine to let a pause sit or give a calm, secure one-liner.",
    );
  return parts.join(" ");
}
