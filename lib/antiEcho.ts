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
const LOOP_LOOKBACK = 3; // only the last few persona lines count as a "loop"
const LOOP_OVERLAP = 0.85; // near-identical short repeat (e.g. "u there" vs "you there?")

// Does `candidate` substantially repeat any of `prior` (recent persona lines)?
export function isEcho(candidate: string, prior: string[]): boolean {
  const cNorm = normalize(candidate);
  const cWords = words(cNorm);
  if (!cWords.length) return false;

  // (0) LOOP / consecutive repeat — ANY length, checks only the last few lines.
  // Catches the "yo still there?" / "u there?" spam where the model gets stuck
  // re-sending the same short filler. The length-gated checks below would miss
  // these because they're under MIN_WORDS.
  if (cWords.length >= 2) {
    for (const p of prior.slice(-LOOP_LOOKBACK)) {
      const pN = normalize(p);
      if (!pN) continue;
      if (pN === cNorm) return true; // exact re-send = a loop, no matter how short
      if (overlapRatio(cWords, words(pN)) >= LOOP_OVERLAP) return true;
    }
  }

  // The remaining checks target substantive re-pastes (anecdotes, sentences).
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

// Last-resort recovery lines. Used only when a reply echoes AND the single
// regeneration ALSO echoes (the model is hard-stuck in a loop) — so the user
// gets a natural "shake it off" line instead of a 3rd identical repeat. Picked
// deterministically by a caller-supplied seed so it varies within a chat without
// needing Math.random.
const LOOP_RECOVERY = [
  "wait sorry, my brain just glitched lol — what were you saying?",
  "ugh ignore that, got distracted for a sec 😅 you were saying?",
  "ok my phone froze for a moment lol. anyway — go on?",
  "sorry, lost my train of thought there. where were we?",
];

export function loopRecoveryLine(seed: number): string {
  const i = Math.abs(Math.trunc(seed)) % LOOP_RECOVERY.length;
  return LOOP_RECOVERY[i];
}
