// Thin abstraction that routes to Anthropic or DeepSeek based on the
// LLM_PROVIDER env var.
//
//   - "anthropic" (default) → Claude Haiku 4.5 + lib/prompts.ts (with prompt caching)
//   - "deepseek"            → deepseek-chat + lib/promptsDeepSeek.ts
//   - "mixed"               → 50/50 coin flip per SESSION (not per turn). Once
//                             a session picks a provider, that provider serves
//                             every turn of that chat for consistency.
//
// The Anthropic call is identical to what was previously inline in the route
// handlers — copying it verbatim keeps the Claude flow untouched.
//
// Each provider has its own system prompt file so the two can be tuned
// independently. Both use the same conventions ([LEAVE], [STAY], \n bursts)
// so the downstream parser works for either.

import type { Persona } from "./persona";
import type { UserPrefs } from "./prefs";
import type { UserMemory } from "./sessions";
import { buildSystemPrompt } from "./prompts";
import { buildSystemPromptDeepSeek } from "./promptsDeepSeek";
import { cachedSystem, getAnthropic, MODEL } from "./anthropic";
import { deepseekChat } from "./deepseek";

export type LLMProvider = "anthropic" | "deepseek";
export type LLMProviderConfig = LLMProvider | "mixed";

function getEnvConfig(): LLMProviderConfig {
  const env = process.env.LLM_PROVIDER;
  if (env === "deepseek") return "deepseek";
  if (env === "mixed") return "mixed";
  return "anthropic";
}

// Called at session creation. For "mixed" mode, rolls a coin so each session
// commits to one provider for its lifetime — keeps a chat coherent (no
// mid-conversation switch from Claude voice to DeepSeek voice).
//
// In "mixed" mode the split is weighted by MIXED_DEEPSEEK_SHARE (0..1) — the
// fraction of sessions sent to DeepSeek, the rest to Anthropic/Claude. Default
// 0.5 (even). e.g. 0.7 → 70% DeepSeek / 30% Claude.
function deepseekShare(): number {
  const raw = Number(process.env.MIXED_DEEPSEEK_SHARE);
  if (!Number.isFinite(raw)) return 0.5;
  return Math.min(1, Math.max(0, raw));
}

export function pickProviderForSession(): LLMProvider {
  const cfg = getEnvConfig();
  if (cfg === "mixed") return Math.random() < deepseekShare() ? "deepseek" : "anthropic";
  return cfg;
}

// Back-compat default picker. If "mixed" mode is on and this is called outside
// a session context, falls back to anthropic — but in normal flow, callLLM()
// receives an explicit per-session provider, so this default rarely fires.
export function getActiveProvider(): LLMProvider {
  const cfg = getEnvConfig();
  if (cfg === "mixed") return "anthropic";
  return cfg;
}

// Cap conversation history sent to the LLM. The persona's identity (country,
// age, mood, personality, etc.) lives in the system prompt and is always sent
// in full — only the message history rolls. User-shared identity from the
// prefs form (their country, gender, intent, language) is also baked into the
// system prompt's user-context section, so it never gets dropped.
//
// What CAN drop with a tight window: in-chat reveals like the user's name,
// hobbies they shared, mid-chat backstory. Acceptable for chat-with-stranger
// realism — real strangers don't have perfect recall either.
//
// Tunable via HISTORY_LIMIT env var. Default 20 messages = ~10 turns of recent
// back-and-forth, which is plenty for conversational coherence.
const HISTORY_LIMIT = Math.max(2, Number(process.env.HISTORY_LIMIT) || 20);

export function trimHistory<T>(messages: T[]): T[] {
  if (messages.length <= HISTORY_LIMIT) return messages;
  return messages.slice(-HISTORY_LIMIT);
}

export interface LLMRequest {
  persona: Persona;
  prefs?: UserPrefs;
  // Rolling categorized notes about the user (from lib/userMemory.ts).
  // Injected into the system prompt so the persona "remembers" things — both
  // factually and emotionally — even after history trims.
  userMemory?: UserMemory;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  // Optional override — used when a session has already committed to a
  // specific provider (mixed-mode sessions). If omitted, falls back to the
  // env-derived default.
  provider?: LLMProvider;
}

export async function callLLM(req: LLMRequest): Promise<string> {
  const provider = req.provider ?? getActiveProvider();

  if (provider === "deepseek") {
    const system = buildSystemPromptDeepSeek(req.persona, req.prefs, req.userMemory);
    return deepseekChat({
      system,
      messages: req.messages,
      maxTokens: req.maxTokens,
    });
  }

  // anthropic (default) — preserved verbatim from original route handlers
  const system = buildSystemPrompt(req.persona, req.prefs, req.userMemory);
  const resp = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: req.maxTokens,
    system: cachedSystem(system),
    messages: req.messages,
  });
  const block = resp.content.find(b => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}
