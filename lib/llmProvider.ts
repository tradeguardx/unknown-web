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
import { isIndicLanguage, type UserPrefs } from "./prefs";
import type { UserMemory } from "./sessions";
import { buildSystemPrompt, memorySection } from "./prompts";
import { buildSystemPromptLean } from "./promptsLean";
import { directorSection } from "./conversationDirector";

// Modular lean prompt (<1k-token core + on-demand modules) vs the legacy monolith.
// On this branch the DEFAULT is lean (for A/B vs production); set PROMPT_MODE=full
// to force the legacy monolith. Same signature → drop-in.
const buildStaticPrompt =
  process.env.PROMPT_MODE === "full" ? buildSystemPrompt : buildSystemPromptLean;
import { buildSystemPromptDeepSeek } from "./promptsDeepSeek";
import { cachedSystem, anthropicFetch } from "./anthropic";
import { deepseekChat } from "./deepseek";
import { sarvamChat } from "./sarvam";
import { normalizeUsage, type TokenUsage } from "./usage";

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
// In "mixed" mode we route by LANGUAGE (DeepSeek is OUT of auto-routing):
//   - Indic languages (hinglish, punjabi, tamil, …) → Sarvam. India-built, tuned
//     for Indian languages + code-mixing, and now brevity-disciplined (prompts.ts).
//   - Everything else (English, unset/stale, every other language) → Claude. Best
//     general quality + naturally short, human-paced replies.
export function pickProviderForSession(prefs?: UserPrefs): LLMProvider {
  const cfg = getEnvConfig();
  if (cfg !== "mixed") return cfg; // forced single-provider mode
  // Indic → Sarvam; everything else → Claude.
  return isIndicLanguage(prefs?.language) ? "sarvam" : "anthropic";
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
  // Optional extra system directive — used by the anti-echo guard to nudge a
  // regeneration away from repeating a line the persona already said.
  extraDirective?: string;
  // Optional usage sink — called with normalized token usage + the provider that
  // served the call, so the caller can accumulate per-session cost. (lib/usage.ts)
  onUsage?: (usage: TokenUsage, provider: LLMProvider) => void;
}

export async function callLLM(req: LLMRequest): Promise<string> {
  const provider = req.provider ?? getActiveProvider();
  // L3 Conversation Director — structured-state block. Rides in the uncached
  // section (with memory) so it never busts the Claude cache. Pass the last user
  // message so the "energy" field can mirror their length.
  const lastUserText = [...req.messages].reverse().find((m) => m.role === "user")?.content;
  const director = directorSection(req.messages.length, req.userMemory, req.prefs, lastUserText);
  const extra = (req.extraDirective ? `\n\n${req.extraDirective}` : "") + director;
  // Provider-aware adapter: client gives us raw usage, we normalize + tag it.
  const sink = req.onUsage
    ? (raw: unknown) => req.onUsage!(normalizeUsage(raw, provider), provider)
    : undefined;

  if (provider === "deepseek") {
    const system = buildSystemPromptDeepSeek(req.persona, req.prefs, req.userMemory) + extra;
    return deepseekChat({
      system,
      messages: req.messages,
      maxTokens: req.maxTokens,
      onUsage: sink,
    });
  }

  // sarvam (TEST/EVAL only) — Indic-tuned. Uses the SAME prompt as Claude
  // (buildSystemPrompt + memorySection) for a fair language/persona comparison.
  if (provider === "sarvam") {
    const system = buildStaticPrompt(req.persona, req.prefs) + memorySection(req.userMemory) + extra;
    return sarvamChat({
      system,
      messages: req.messages,
      maxTokens: req.maxTokens,
      onUsage: sink,
    });
  }

  // anthropic — static persona prompt is cached; rolling memory is appended as a
  // separate (uncached) block after the cache breakpoint so memory refreshes
  // don't invalidate the cached persona prefix. The anti-echo directive (when
  // present) rides in the uncached memory block so it never breaks the cache.
  const staticPrompt = buildStaticPrompt(req.persona, req.prefs);
  const memory = memorySection(req.userMemory) + extra;
  return anthropicFetch({
    system: cachedSystem(staticPrompt, memory),
    messages: req.messages,
    maxTokens: req.maxTokens,
    onUsage: sink,
  });
}
