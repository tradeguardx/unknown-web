// Chat summary generator. When a chat closes, we produce a short, neutral
// summary of WHAT HAPPENED — purely so we (the operators) can eyeball whether
// the system is behaving well: did the persona feel human, did the conversation
// flow, why did it end. It is NOT shown to users and never re-enters a chat.
//
// Privacy stance: we summarize, we do NOT store the raw transcript. The summary
// is a few sentences of behavioral observation, not a verbatim log.
//
// Uses DeepSeek (cheap, fast) exactly like lib/userMemory.ts. If DEEPSEEK_API_KEY
// isn't set, summarization is silently skipped.

import { DEEPSEEK_EXTRACT_MODEL, deepseekChat, isDeepSeekAvailable } from "./deepseek";
import type { Session } from "./sessions";

const SUMMARY_SYSTEM_PROMPT = `You are a QA observer for an anonymous "talk to a stranger" chat app where the "stranger" is an AI persona pretending to be a real person. You will see a transcript of one chat (USER = the human, STRANGER = the AI persona).

Write a SHORT operational summary for the app operators. Goal: help them judge whether the system worked well. Be neutral and factual. Do NOT moralize, do NOT include verbatim quotes of anything sensitive.

Cover, in 3-5 short sentences:
- What the user seemed to want / what the conversation was about (high level).
- How the chat went (engaged, flat, flirty, hostile, short, etc.).
- Whether the persona felt human and consistent, or broke character / glitched.
- Why it likely ended (user left, persona left, drifted off, policy, etc.).

Output ONLY the summary text. No headers, no preamble, no bullet points.`;

// Cap how many messages we feed the summarizer — last N turns is plenty to
// characterize a chat and keeps token cost trivial.
const MAX_MESSAGES_FOR_SUMMARY = 40;

export async function summarizeChat(session: Session): Promise<string | null> {
  if (!isDeepSeekAvailable()) return null;
  // Nothing meaningful to summarize for an empty / one-line chat.
  if (session.messages.length < 2) return null;

  const recent = session.messages.slice(-MAX_MESSAGES_FOR_SUMMARY);
  const transcript = recent
    .map((m) => `${m.role === "user" ? "USER" : "STRANGER"}: ${m.content}`)
    .join("\n");

  const context = [
    `intent: ${session.prefs?.intent ?? "unset"}`,
    `language: ${session.prefs?.language ?? "unset"}`,
    `persona: ${session.persona.age}yo ${session.persona.gender} from ${session.persona.country}, mood=${session.persona.mood}, archetype=${session.persona.archetype}`,
    `end_reason: ${session.endReason ?? "unknown"}`,
  ].join(" | ");

  const userPrompt = `CONTEXT: ${context}\n\nTRANSCRIPT:\n${transcript}\n\nWrite the operational summary now.`;

  try {
    const out = await deepseekChat({
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 220,
      model: DEEPSEEK_EXTRACT_MODEL,
    });
    const trimmed = out.trim();
    return trimmed.length ? trimmed : null;
  } catch (err) {
    console.warn(
      "[chatSummary] failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
