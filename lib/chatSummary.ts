// Chat insight generator. When a chat closes, we extract a rich structured read
// on what happened — a human-readable summary PLUS machine fields that let us
// understand the USER (who they are, what they wanted, how they felt) and the
// OUTCOME (did it click). Paired with the full persona "recipe" emitted in
// events.ts, each chat becomes one labeled row: recipe × audience → outcome.
// That dataset is what lets us enrich/optimize personas (and build bespoke ones)
// later. Operators only; never shown to users, never re-enters a chat.
//
// Privacy: we summarize, we do NOT store the raw transcript. All inferred user
// attributes are BUCKETED/BOOLEAN — no names, no exact ages, no quotes.
//
// Summary model is the OPPOSITE of the chat model: Indic chats run on Sarvam,
// so we summarize them on Claude; English/other chats run on Claude, so we
// summarize them on Sarvam. DeepSeek is the last-resort fallback if neither of
// the preferred two has a key. Silently skipped if nothing is available.

import { anthropicChat, isAnthropicAvailable } from "./anthropic";
import { sarvamChat, isSarvamAvailable } from "./sarvam";
import { deepseekChat, isDeepSeekAvailable } from "./deepseek";
import type { Session } from "./sessions";
import { addUsage, normalizeUsage } from "./usage";

type SummaryProvider = "anthropic" | "sarvam" | "deepseek";

// Choose the summary model as the inverse of the chat provider, with graceful
// fallback when a key is missing. Returns null if no provider is usable.
function pickSummaryProvider(chatProvider: Session["provider"]): SummaryProvider | null {
  // Indic chats were served by Sarvam → summarize on Claude (and vice-versa).
  const preferred: SummaryProvider = chatProvider === "sarvam" ? "anthropic" : "sarvam";
  const available: Record<SummaryProvider, boolean> = {
    anthropic: isAnthropicAvailable(),
    sarvam: isSarvamAvailable(),
    deepseek: isDeepSeekAvailable(),
  };
  // preferred → the other of the two chat models → deepseek.
  const order: SummaryProvider[] =
    preferred === "anthropic"
      ? ["anthropic", "sarvam", "deepseek"]
      : ["sarvam", "anthropic", "deepseek"];
  return order.find((p) => available[p]) ?? null;
}

const SUMMARY_CHAT = {
  anthropic: anthropicChat,
  sarvam: sarvamChat,
  deepseek: deepseekChat,
} as const;

export type ArcMood =
  | "happy" | "excited" | "flirty" | "neutral" | "curious"
  | "bored" | "sad" | "lonely" | "anxious" | "angry" | "unknown";

export interface ChatInsight {
  summary: string; // 2-4 sentence operational summary
  engagement: "high" | "medium" | "low"; // how engaged the USER was
  userSentiment: "positive" | "neutral" | "negative" | "mixed";
  personaRealism: "convincing" | "okay" | "broke_character"; // did the AI feel human?
  endTrigger: string; // short: why/how it ended
  topics: string[]; // up to 4 short topic tags
  improvement: string; // one line: how the persona could've done better

  // ── Emotional arc (inferred from the full transcript at close) ──
  moodStart: ArcMood;
  moodMid: ArcMood;
  moodEnd: ArcMood;
  moodShift: "improved" | "flat" | "declined";
  feltBetter: boolean; // did the chat lift the user's mood
  openness: "opened_up" | "surface" | "guarded";

  // ── Who the user is (inferred; bucketed, no PII) ──
  userAgeGroup: "<18" | "18-24" | "25-34" | "35+" | "unknown";
  userGenderRevealed: "male" | "female" | "other" | "unknown";
  lifeStage: "student" | "working" | "other" | "unknown";
  typedLanguage: string; // what the user actually wrote in (e.g. "english", "hinglish")
  lonelinessSignal: boolean;

  // ── What the user wanted (feeds persona enrichment) ──
  inferredIntent: string; // what they ACTUALLY sought, vs the form
  userInterests: string[]; // up to 4 things the USER is into
  respondedWellTo: string; // what persona energy clicked, e.g. "playful teasing", "being listened to"

  // ── How it went ──
  connectionQuality: "clicked" | "lukewarm" | "mismatch";
  botAccusation: boolean; // did the user suspect they were talking to an AI
  flirtLevel: "none" | "light" | "heavy";

  // ── Safety (booleans only, never content) ──
  minorSelfDisclosed: boolean; // user indicated they are under 18
  abusiveUser: boolean;
  distressSignal: boolean; // self-harm / crisis language
}

const SYSTEM_PROMPT = `You are a QA + audience analyst for an anonymous "talk to a stranger" app where the "stranger" is an AI persona pretending to be a real person. You are given one chat transcript (USER = human, STRANGER = the AI persona).

Return a structured assessment that helps us (1) improve personas and (2) understand the user. Be neutral and concrete. Do NOT quote sensitive content. Infer ONLY from what's actually in the transcript — when something isn't evidenced, use "unknown" (for enums) or false (for booleans). Bucket everything; never output names, exact ages, or locations.

Respond with ONLY a JSON object (no markdown, no prose) of this exact shape:
{
  "summary": "2-4 sentences: what the user wanted, how it went, why it ended",
  "engagement": "high" | "medium" | "low",
  "userSentiment": "positive" | "neutral" | "negative" | "mixed",
  "personaRealism": "convincing" | "okay" | "broke_character",
  "endTrigger": "short phrase, e.g. 'user went silent', 'persona left', 'user got bored'",
  "topics": ["1-4 short lowercase topic tags"],
  "improvement": "one concrete line on how this persona could've felt more human / kept the user engaged",

  "moodStart": "user's mood in the FIRST third of the chat",
  "moodMid": "user's mood in the MIDDLE third",
  "moodEnd": "user's mood in the LAST third",
  "moodShift": "improved" | "flat" | "declined",
  "feltBetter": true | false,
  "openness": "opened_up" | "surface" | "guarded",

  "userAgeGroup": "<18" | "18-24" | "25-34" | "35+" | "unknown",
  "userGenderRevealed": "male" | "female" | "other" | "unknown",
  "lifeStage": "student" | "working" | "other" | "unknown",
  "typedLanguage": "lowercase language the USER typed in, e.g. 'english','hinglish','punjabi'",
  "lonelinessSignal": true | false,

  "inferredIntent": "what the user ACTUALLY wanted (e.g. 'flirt','vent','friend','bored','advice','sexual'), regardless of any stated filter",
  "userInterests": ["1-4 things the USER is into, from what they said"],
  "respondedWellTo": "what persona energy the user responded to best, e.g. 'playful teasing','being listened to','shared interest' (or 'nothing' if it flopped)",

  "connectionQuality": "clicked" | "lukewarm" | "mismatch",
  "botAccusation": true | false,
  "flirtLevel": "none" | "light" | "heavy",

  "minorSelfDisclosed": true | false,
  "abusiveUser": true | false,
  "distressSignal": true | false
}
Mood values must be one of: happy, excited, flirty, neutral, curious, bored, sad, lonely, anxious, angry, unknown.`;

const MAX_MESSAGES = 40;

const VALID_ENGAGEMENT = new Set(["high", "medium", "low"]);
const VALID_SENTIMENT = new Set(["positive", "neutral", "negative", "mixed"]);
const VALID_REALISM = new Set(["convincing", "okay", "broke_character"]);
const VALID_MOOD = new Set<string>([
  "happy", "excited", "flirty", "neutral", "curious",
  "bored", "sad", "lonely", "anxious", "angry", "unknown",
]);
const VALID_SHIFT = new Set(["improved", "flat", "declined"]);
const VALID_OPENNESS = new Set(["opened_up", "surface", "guarded"]);
const VALID_AGE = new Set(["<18", "18-24", "25-34", "35+", "unknown"]);
const VALID_GENDER = new Set(["male", "female", "other", "unknown"]);
const VALID_LIFE = new Set(["student", "working", "other", "unknown"]);
const VALID_CONN = new Set(["clicked", "lukewarm", "mismatch"]);
const VALID_FLIRT = new Set(["none", "light", "heavy"]);

export async function summarizeChat(session: Session): Promise<ChatInsight | null> {
  const provider = pickSummaryProvider(session.provider);
  if (!provider) return null;
  if (session.messages.length < 2) return null;

  const recent = session.messages.slice(-MAX_MESSAGES);
  const transcript = recent
    .map((m) => `${m.role === "user" ? "USER" : "STRANGER"}: ${m.content}`)
    .join("\n");

  const context = [
    `intent: ${session.prefs?.intent ?? "unset"}`,
    `language: ${session.prefs?.language ?? "unset"}`,
    `persona: ${session.persona.age}yo ${session.persona.gender} from ${session.persona.country}, mood=${session.persona.mood}, archetype=${session.persona.archetype}`,
    `end_reason: ${session.endReason ?? "unknown"}`,
  ].join(" | ");

  let raw: string;
  try {
    raw = await SUMMARY_CHAT[provider]({
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `CONTEXT: ${context}\n\nTRANSCRIPT:\n${transcript}\n\nReturn the JSON now.` },
      ],
      maxTokens: 450,
      onUsage: (u) => addUsage(session.usage, provider, normalizeUsage(u, provider)),
    });
  } catch (err) {
    console.warn("[chatSummary] failed:", err instanceof Error ? err.message : String(err));
    return null;
  }

  return normalize(raw, session);
}

function normalize(raw: string, session: Session): ChatInsight | null {
  // Strip code fences / surrounding prose and grab the JSON object.
  const match = raw.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown> = {};
  if (match) {
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      /* fall through to defaults */
    }
  }

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim()
      : raw.trim().slice(0, 600);
  if (!summary) return null;

  const pick = (v: unknown, valid: Set<string>, fallback: string) =>
    typeof v === "string" && valid.has(v) ? v : fallback;
  const bool = (v: unknown) => v === true || v === "true";
  const tagList = (v: unknown) =>
    Array.isArray(v)
      ? v
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().toLowerCase().slice(0, 24))
          .filter(Boolean)
          .slice(0, 4)
      : [];
  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  return {
    summary,
    engagement: pick(parsed.engagement, VALID_ENGAGEMENT, "medium") as ChatInsight["engagement"],
    userSentiment: pick(parsed.userSentiment, VALID_SENTIMENT, "neutral") as ChatInsight["userSentiment"],
    personaRealism: pick(parsed.personaRealism, VALID_REALISM, "okay") as ChatInsight["personaRealism"],
    endTrigger:
      typeof parsed.endTrigger === "string" && parsed.endTrigger.trim()
        ? parsed.endTrigger.trim().slice(0, 60)
        : session.endReason ?? "unknown",
    topics: tagList(parsed.topics),
    improvement: str(parsed.improvement, 200),

    moodStart: pick(parsed.moodStart, VALID_MOOD, "unknown") as ArcMood,
    moodMid: pick(parsed.moodMid, VALID_MOOD, "unknown") as ArcMood,
    moodEnd: pick(parsed.moodEnd, VALID_MOOD, "unknown") as ArcMood,
    moodShift: pick(parsed.moodShift, VALID_SHIFT, "flat") as ChatInsight["moodShift"],
    feltBetter: bool(parsed.feltBetter),
    openness: pick(parsed.openness, VALID_OPENNESS, "surface") as ChatInsight["openness"],

    userAgeGroup: pick(parsed.userAgeGroup, VALID_AGE, "unknown") as ChatInsight["userAgeGroup"],
    userGenderRevealed: pick(parsed.userGenderRevealed, VALID_GENDER, "unknown") as ChatInsight["userGenderRevealed"],
    lifeStage: pick(parsed.lifeStage, VALID_LIFE, "unknown") as ChatInsight["lifeStage"],
    typedLanguage: str(parsed.typedLanguage, 24).toLowerCase() || "unknown",
    lonelinessSignal: bool(parsed.lonelinessSignal),

    inferredIntent: str(parsed.inferredIntent, 40).toLowerCase() || "unknown",
    userInterests: tagList(parsed.userInterests),
    respondedWellTo: str(parsed.respondedWellTo, 80),

    connectionQuality: pick(parsed.connectionQuality, VALID_CONN, "lukewarm") as ChatInsight["connectionQuality"],
    botAccusation: bool(parsed.botAccusation),
    flirtLevel: pick(parsed.flirtLevel, VALID_FLIRT, "none") as ChatInsight["flirtLevel"],

    minorSelfDisclosed: bool(parsed.minorSelfDisclosed),
    abusiveUser: bool(parsed.abusiveUser),
    distressSignal: bool(parsed.distressSignal),
  };
}
