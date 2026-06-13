// Anti-echo guard. The single most immersion-breaking "I'm a bot" tell is a
// persona repeating one of its OWN earlier lines near-verbatim (e.g. re-pasting
// the same "my motorcycle roars to life" anecdote six turns later). The prompt
// forbids it, but some providers (notably Sarvam) still do it — so we catch it
// in code and regenerate once.
//
// isEcho(candidate, priorAssistantMessages) returns true when the candidate
// substantially duplicates something the persona already said this chat.

// Strip emojis/punctuation/case so "satisfying somehow 🤘" and "satisfying,
// somehow!" compare equal. Keep letters, numbers, and spaces only.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): string[] {
  return s ? s.split(" ").filter(Boolean) : [];
}

// Word-set overlap relative to the SMALLER set — high when one line is contained
// in / heavily reworded from another, regardless of length difference.
function overlapRatio(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const shared = a.filter((w) => setB.has(w)).length;
  return shared / Math.min(a.length, b.length);
}

const MIN_WORDS = 6; // ignore short reactions ("lol same", "yeah fr") — repeats there are fine
const SUBSTRING_MIN = 5; // a 5+ word verbatim run inside a prior message = echo
const OVERLAP_THRESHOLD = 0.8; // 80%+ shared words with a prior line = reworded echo

// Does `candidate` substantially repeat any of `prior` (recent persona lines)?
export function isEcho(candidate: string, prior: string[]): boolean {
  const cNorm = normalize(candidate);
  const cWords = words(cNorm);
  if (cWords.length < MIN_WORDS) return false;

  // Candidate split into its own sentences/clauses, so a single repeated
  // sentence buried in an otherwise-fresh message is still caught.
  const cSentences = cNorm
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => words(s).length >= MIN_WORDS);

  for (const p of prior) {
    const pNorm = normalize(p);
    if (!pNorm) continue;
    const pWords = words(pNorm);

    // 1) Whole-message near-duplicate (reworded repeats).
    if (overlapRatio(cWords, pWords) >= OVERLAP_THRESHOLD) return true;

    // 2) A specific sentence the persona already said, re-sent verbatim.
    for (const sent of cSentences) {
      if (pNorm.includes(sent) && words(sent).length >= SUBSTRING_MIN) return true;
      if (overlapRatio(words(sent), pWords) >= OVERLAP_THRESHOLD) return true;
    }
  }
  return false;
}

// Directive appended to the system prompt on a regeneration after an echo was
// detected, so the retry doesn't just repeat the same line again.
export const ANTI_ECHO_NUDGE =
  "IMPORTANT: Your previous draft repeated something you already said earlier in this chat. Do NOT reuse any sentence, phrase, or anecdote you've used before — not even reworded. Say something genuinely new that moves the conversation forward.";
