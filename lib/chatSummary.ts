// Chat insight generator. When a chat closes, we extract a SHORT structured
// read on what happened — both a human-readable summary AND machine fields we can
// aggregate to understand how to improve the personas. Operators only; never
// shown to users, never re-enters a chat.
//
// Privacy: we summarize, we do NOT store the raw transcript.
//
// Uses DeepSeek (cheap, fast) like lib/userMemory.ts. If DEEPSEEK_API_KEY isn't
// set, insight is silently skipped.

import { DEEPSEEK_EXTRACT_MODEL, deepseekChat, isDeepSeekAvailable } from "./deepseek";
import type { Session } from "./sessions";

export interface ChatInsight {
  summary: string; // 2-4 sentence operational summary
  engagement: "high" | "medium" | "low"; // how engaged the USER was
  userSentiment: "positive" | "neutral" | "negative" | "mixed";
  personaRealism: "convincing" | "okay" | "broke_character"; // did the AI feel human?
  endTrigger: string; // short: why/how it ended
  topics: string[]; // up to 4 short topic tags
  improvement: string; // one line: how the persona could've done better
}

const SYSTEM_PROMPT = `You are a QA analyst for an anonymous "talk to a stranger" app where the "stranger" is an AI persona pretending to be a real person. You are given one chat transcript (USER = human, STRANGER = the AI persona).

Return a SHORT structured assessment to help operators improve the personas. Be neutral and concrete. Do NOT quote sensitive content.

Respond with ONLY a JSON object (no markdown, no prose) of this exact shape:
{
  "summary": "2-4 sentences: what the user wanted, how it went, why it ended",
  "engagement": "high" | "medium" | "low",          // how engaged/invested the USER was
  "userSentiment": "positive" | "neutral" | "negative" | "mixed",
  "personaRealism": "convincing" | "okay" | "broke_character",  // did the STRANGER feel like a real human?
  "endTrigger": "short phrase, e.g. 'user went silent', 'persona left', 'user got bored', 'policy'",
  "topics": ["1-4 short lowercase topic tags, e.g. 'relationships','college','gaming'"],
  "improvement": "one concrete line on how this persona could have felt more human / kept the user engaged"
}`;

const MAX_MESSAGES = 40;

const VALID_ENGAGEMENT = new Set(["high", "medium", "low"]);
const VALID_SENTIMENT = new Set(["positive", "neutral", "negative", "mixed"]);
const VALID_REALISM = new Set(["convincing", "okay", "broke_character"]);

export async function summarizeChat(session: Session): Promise<ChatInsight | null> {
  if (!isDeepSeekAvailable()) return null;
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
    raw = await deepseekChat({
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `CONTEXT: ${context}\n\nTRANSCRIPT:\n${transcript}\n\nReturn the JSON now.` },
      ],
      maxTokens: 400,
      model: DEEPSEEK_EXTRACT_MODEL,
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

  const topics = Array.isArray(parsed.topics)
    ? parsed.topics
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase().slice(0, 24))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return {
    summary,
    engagement: pick(parsed.engagement, VALID_ENGAGEMENT, "medium") as ChatInsight["engagement"],
    userSentiment: pick(parsed.userSentiment, VALID_SENTIMENT, "neutral") as ChatInsight["userSentiment"],
    personaRealism: pick(parsed.personaRealism, VALID_REALISM, "okay") as ChatInsight["personaRealism"],
    endTrigger:
      typeof parsed.endTrigger === "string" && parsed.endTrigger.trim()
        ? parsed.endTrigger.trim().slice(0, 60)
        : session.endReason ?? "unknown",
    topics,
    improvement:
      typeof parsed.improvement === "string" ? parsed.improvement.trim().slice(0, 200) : "",
  };
}
