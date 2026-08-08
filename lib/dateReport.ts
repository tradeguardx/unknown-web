// The Dating Report engine — the heart of the "unknown.date" experience.
// Takes a finished date transcript and scores how the USER did on the date, then
// returns a structured report (score, archetype, stats, flags, the date's verdict,
// best/cringe moment, tips). Runs on DeepSeek/Sarvam (no Claude) — a background
// analysis the user pays to fully unlock.
//
// Which fields are "teaser" (shown free / shareable) vs "locked" (paid) is decided
// by the UI, not here — this always produces the full report; the API/paywall gates it.

import { deepseekChat, isDeepSeekAvailable } from "./deepseek";
import { sarvamChat, isSarvamAvailable } from "./sarvam";
import { isIndicLanguage } from "./prefs";
import type { Persona } from "./persona";

export interface DateStat {
  key: string; // charm | humor | confidence | empathy | flow | curiosity | flirtiness
  score: number; // 0–100
}

export interface DateReport {
  overallScore: number; // 0–100
  archetype: string; // e.g. "The Charming Listener"
  archetypeEmoji: string; // e.g. "🎧"
  tagline: string; // one warm line summarizing their date energy
  stats: DateStat[];
  greenFlags: string[]; // specific, positive
  redFlags: string[]; // specific, gentle, constructive
  verdict: { secondDatePct: number; line: string }; // the persona's take (share hook)
  bestMoment: { quote: string; why: string } | null;
  cringeMoment: { quote: string; why: string } | null;
  tips: string[]; // 3–5 actionable — the paid gold
}

const STAT_KEYS = ["charm", "humor", "confidence", "empathy", "flow", "curiosity", "flirtiness"];

const SYSTEM = `You are a warm, sharp dating coach reviewing a first-date chat between a USER and their date (the STRANGER). Score how the USER did — ONLY the user, never the date. It was a sweet, casual first date (no explicit content). Be honest but kind, specific, and a little fun — like a friend who gives great feedback.

Output STRICT JSON only, no prose outside it, in EXACTLY this shape:
{
  "overallScore": <0-100 int>,
  "archetype": "<2-4 word 'date archetype' for the user, e.g. 'The Charming Listener', 'The Sweet Overthinker', 'The Smooth Talker', 'The Try-hard', 'The Mysterious One'>",
  "archetypeEmoji": "<single emoji fitting the archetype>",
  "tagline": "<one warm sentence (<=12 words) capturing their date energy>",
  "stats": [ {"key":"charm","score":<0-100>}, {"key":"humor","score":<0-100>}, {"key":"confidence","score":<0-100>}, {"key":"empathy","score":<0-100>}, {"key":"flow","score":<0-100>}, {"key":"curiosity","score":<0-100>}, {"key":"flirtiness","score":<0-100>} ],
  "greenFlags": ["<specific good thing they did>", "..."],
  "redFlags": ["<specific, gentle thing to improve>", "..."],
  "verdict": { "secondDatePct": <0-100 int: how likely the DATE would want a second date>, "line": "<the date's playful one-line verdict, in first person, e.g. 'honestly? i'd say yes to a second date'>" },
  "bestMoment": { "quote": "<a real short line the USER actually sent>", "why": "<why it landed>" },
  "cringeMoment": { "quote": "<a real weak line the USER sent, or null>", "why": "<why it was off>" },
  "tips": ["<actionable tip to date better>", "...", "..."]
}
Rules: 2-4 green flags, 1-3 red flags, 3-5 tips. Quotes MUST be real lines from the USER in the transcript (verbatim, trimmed). If there's not enough from the user to judge a dimension, score it modestly (40-60) rather than inventing. cringeMoment may be null if they did well. Keep everything grounded in what actually happened.`;

function pick(language?: string) {
  const indic = isIndicLanguage(language);
  if (indic && isSarvamAvailable()) return { chat: sarvamChat, name: "sarvam" as const };
  if (isDeepSeekAvailable()) return { chat: deepseekChat, name: "deepseek" as const };
  if (isSarvamAvailable()) return { chat: sarvamChat, name: "sarvam" as const };
  return null;
}

function clampInt(v: unknown, lo: number, hi: number, dflt: number): number {
  const n = typeof v === "number" ? Math.round(v) : NaN;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

/**
 * Generate a Dating Report from the transcript. Returns null on failure so the
 * caller can retry / show a graceful error (never a half-report).
 */
export async function generateDateReport(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  persona: Persona,
  language?: string,
  onUsage?: (raw: unknown, provider: string) => void,
): Promise<DateReport | null> {
  const provider = pick(language);
  if (!provider) return null;
  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns < 3) return null; // too little to fairly score

  const transcript = messages
    .map((m) => `${m.role === "user" ? "USER" : "DATE"}: ${m.content}`)
    .join("\n");
  const ctx = `The date was ${persona.name}, ${persona.age}, ${persona.gender}. Score the USER.\n\nTRANSCRIPT:\n${transcript}\n\nReturn the JSON now.`;

  let raw: string;
  try {
    raw = await provider.chat({
      system: SYSTEM,
      messages: [{ role: "user", content: ctx }],
      maxTokens: 900,
      onUsage: onUsage ? (u) => onUsage(u, provider.name) : undefined,
    });
  } catch (err) {
    console.warn("[dateReport] failed:", err instanceof Error ? err.message : String(err));
    return null;
  }

  try {
    const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const statsIn: Record<string, number> = {};
    if (Array.isArray(j.stats)) for (const s of j.stats) if (s?.key) statsIn[String(s.key)] = s.score;
    const stats: DateStat[] = STAT_KEYS.map((k) => ({ key: k, score: clampInt(statsIn[k], 0, 100, 50) }));

    const strArr = (a: unknown, max: number): string[] =>
      Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : [];
    const moment = (m: unknown): { quote: string; why: string } | null => {
      if (!m || typeof m !== "object") return null;
      const q = String((m as Record<string, unknown>).quote ?? "").trim();
      const w = String((m as Record<string, unknown>).why ?? "").trim();
      return q ? { quote: q.slice(0, 240), why: w.slice(0, 240) } : null;
    };

    return {
      overallScore: clampInt(j.overallScore, 0, 100, 60),
      archetype: String(j.archetype ?? "The Mystery Date").slice(0, 40),
      archetypeEmoji: String(j.archetypeEmoji ?? "💘").slice(0, 4),
      tagline: String(j.tagline ?? "").slice(0, 120),
      stats,
      greenFlags: strArr(j.greenFlags, 4),
      redFlags: strArr(j.redFlags, 3),
      verdict: {
        secondDatePct: clampInt(j?.verdict?.secondDatePct, 0, 100, 50),
        line: String(j?.verdict?.line ?? "that was fun — i'd see you again 🙂").slice(0, 160),
      },
      bestMoment: moment(j.bestMoment),
      cringeMoment: moment(j.cringeMoment),
      tips: strArr(j.tips, 5),
    };
  } catch (err) {
    console.warn("[dateReport] parse failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
