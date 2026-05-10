// Thin abstraction that routes to Anthropic or DeepSeek based on the
// LLM_PROVIDER env var.
//
//   - "anthropic" (default) → Claude Haiku 4.5 + lib/prompts.ts (with prompt caching)
//   - "deepseek"            → deepseek-chat + lib/promptsDeepSeek.ts
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

export function getActiveProvider(): LLMProvider {
  return process.env.LLM_PROVIDER === "deepseek" ? "deepseek" : "anthropic";
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
}

export async function callLLM(req: LLMRequest): Promise<string> {
  const provider = getActiveProvider();

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
