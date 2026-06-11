// Thin abstraction that routes to a chat LLM based on the LLM_PROVIDER env var.
//
//   - "anthropic"  → Claude Haiku 4.5 + lib/prompts.ts (with prompt caching)
//   - "sarvam"     → Sarvam (Indic-tuned) + lib/prompts.ts (same prompt as Claude)
//   - "deepseek"   → deepseek-chat + lib/promptsDeepSeek.ts (no longer in default routing)
//   - "mixed"      → PRODUCTION mode. Route per SESSION by language: English +
//                    Indic → Sarvam, everything else → Claude. The provider is
//                    fixed for the chat's lifetime (no mid-chat voice switch).
//
// Anthropic and Sarvam share lib/prompts.ts; DeepSeek has its own (promptsDeepSeek.ts).
// All use the same conventions ([LEAVE], [STAY], \n bursts) so the downstream
// parser works for any of them.
//
// NOTE: rolling memory extraction + chat summary run on Claude (see lib/anthropic.ts
// anthropicChat), independent of which provider serves the chat.

import type { Persona } from "./persona";
import { isLanguage, isIndicLanguage, type UserPrefs } from "./prefs";
import type { UserMemory } from "./sessions";
import { buildSystemPrompt, memorySection } from "./prompts";
import { buildSystemPromptDeepSeek } from "./promptsDeepSeek";
import { cachedSystem, getAnthropic, MODEL } from "./anthropic";
import { deepseekChat } from "./deepseek";
import { sarvamChat } from "./sarvam";

export type LLMProvider = "anthropic" | "deepseek" | "sarvam";
export type LLMProviderConfig = LLMProvider | "mixed";

function getEnvConfig(): LLMProviderConfig {
  const env = process.env.LLM_PROVIDER;
  if (env === "deepseek") return "deepseek"; // force all chats to DeepSeek
  if (env === "sarvam") return "sarvam";     // force ALL chats to Sarvam (single-provider)
  if (env === "mixed") return "mixed";       // PROD: language-routed Sarvam/Claude
  return "anthropic";
}

// Called at session creation. The provider is fixed for the chat's lifetime
// (no mid-conversation voice switch).
//
// In "mixed" mode we route by LANGUAGE:
//   - English (or unset/stale) + Indic languages (hinglish, punjabi, …) → Sarvam.
//     Sarvam is tuned for Indian languages + code-mixing and is strong at English
//     too — this is the bulk of our traffic.
//   - Every other (non-Indic, non-English) language → Claude/Anthropic for its
//     stronger general multilingual quality.
// (DeepSeek is no longer in the chat routing.)
export function pickProviderForSession(prefs?: UserPrefs): LLMProvider {
  const cfg = getEnvConfig();
  if (cfg !== "mixed") return cfg; // forced single-provider mode
  const lang = prefs?.language;
  const englishOrIndic = !lang || lang === "english" || !isLanguage(lang) || isIndicLanguage(lang);
  return englishOrIndic ? "sarvam" : "anthropic";
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

  // sarvam (TEST/EVAL only) — Indic-tuned. Uses the SAME prompt as Claude
  // (buildSystemPrompt + memorySection) for a fair language/persona comparison.
  if (provider === "sarvam") {
    const system = buildSystemPrompt(req.persona, req.prefs) + memorySection(req.userMemory);
    return sarvamChat({
      system,
      messages: req.messages,
      maxTokens: req.maxTokens,
    });
  }

  // anthropic — static persona prompt is cached; rolling memory is appended as a
  // separate (uncached) block after the cache breakpoint so memory refreshes
  // don't invalidate the cached persona prefix.
  const staticPrompt = buildSystemPrompt(req.persona, req.prefs);
  const memory = memorySection(req.userMemory);
  const resp = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: req.maxTokens,
    system: cachedSystem(staticPrompt, memory),
    messages: req.messages,
  });
  const block = resp.content.find(b => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}
