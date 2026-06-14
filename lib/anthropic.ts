import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

export const MODEL = "claude-haiku-4-5-20251001";

export function isAnthropicAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Single-shot completion helper for background tasks (rolling memory extraction,
// chat summary). Mirrors deepseekChat's shape so call sites can swap providers
// with a one-line change. Uses Claude Haiku (cheap, fast, reliable structured
// output) by default; override `model` if needed.
export async function anthropicChat(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  model?: string;
  onUsage?: (rawUsage: unknown) => void;
}): Promise<string> {
  const resp = await getAnthropic().messages.create({
    model: opts.model || MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages,
  });
  if (resp.usage) opts.onUsage?.(resp.usage);
  const block = resp.content.find(b => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

// Build the system blocks for prompt caching. The STATIC persona prompt is the
// same on every turn within a session, so the cache breakpoint goes at the end
// of it → cached reads cost ~10% of normal input pricing.
//
// The optional DYNAMIC block (rolling user-memory, which refreshes ~every 10
// messages) is appended AFTER the breakpoint and is NOT cached — so when memory
// changes it doesn't invalidate the big cached persona prefix.
//
// Ephemeral TTL is ~5 min, covering the gap between active turns; a longer
// silence rewrites the cache once (1.25x premium).
type SysBlock = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };
export function cachedSystem(staticText: string, dynamicText?: string): SysBlock[] {
  const blocks: SysBlock[] = [
    { type: "text", text: staticText, cache_control: { type: "ephemeral" } },
  ];
  if (dynamicText && dynamicText.trim()) {
    blocks.push({ type: "text", text: dynamicText });
  }
  return blocks;
}
