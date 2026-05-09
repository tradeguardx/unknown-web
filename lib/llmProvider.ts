// Thin abstraction that routes to Anthropic or Groq based on the LLM_PROVIDER env var.
//
//   - "anthropic" (default) → Claude Haiku 4.5 + lib/prompts.ts (with prompt caching)
//   - "groq"                → Llama 3.3 70B Versatile + lib/promptsGroq.ts
//
// The Anthropic call is identical to what was previously inline in the route
// handlers — copying it verbatim keeps the Claude flow untouched.
//
// Each provider has its own system prompt file so the two can be tuned
// independently. Both use the same conventions ([LEAVE], [STAY], \n bursts)
// so the downstream parser works for either.

import type { Persona } from "./persona";
import type { UserPrefs } from "./prefs";
import { buildSystemPrompt } from "./prompts";
import { buildSystemPromptGroq } from "./promptsGroq";
import { cachedSystem, getAnthropic, MODEL } from "./anthropic";
import { groqChat } from "./groq";

export type LLMProvider = "anthropic" | "groq";

export function getActiveProvider(): LLMProvider {
  return process.env.LLM_PROVIDER === "groq" ? "groq" : "anthropic";
}

export interface LLMRequest {
  persona: Persona;
  prefs?: UserPrefs;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
}

export async function callLLM(req: LLMRequest): Promise<string> {
  const provider = getActiveProvider();

  if (provider === "groq") {
    const system = buildSystemPromptGroq(req.persona, req.prefs);
    return groqChat({
      system,
      messages: req.messages,
      maxTokens: req.maxTokens,
    });
  }

  // anthropic (default) — preserved verbatim from original route handlers
  const system = buildSystemPrompt(req.persona, req.prefs);
  const resp = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: req.maxTokens,
    system: cachedSystem(system),
    messages: req.messages,
  });
  const block = resp.content.find(b => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}
