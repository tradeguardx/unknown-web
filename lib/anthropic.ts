// Anthropic (Claude) via RAW fetch — NOT the @anthropic-ai/sdk. The SDK throws
// "Invalid response body … Premature close" from Fly (undici/keep-alive issue),
// while a plain fetch to the same endpoint with the same key works fine (verified
// on the machine). So we hit /v1/messages directly, like the match-service does.

export const MODEL = "claude-haiku-4-5-20251001";

export function isAnthropicAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// System blocks for prompt caching. The STATIC persona prompt is the same every
// turn within a session, so the cache breakpoint goes at the end of it → cached
// reads cost ~10% of normal input pricing. The optional DYNAMIC block (rolling
// memory) is appended AFTER the breakpoint and is NOT cached, so memory changes
// don't invalidate the big cached prefix.
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

// Core call — raw POST to the Messages API. `system` may be a plain string or an
// array of cache-control blocks (for prompt caching).
export async function anthropicFetch(opts: {
  system: string | SysBlock[];
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  model?: string;
  onUsage?: (rawUsage: unknown) => void;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || MODEL,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: opts.messages,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: unknown;
  };
  if (data.usage) opts.onUsage?.(data.usage);
  const block = data.content?.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text ?? "" : "";
}

// Single-shot helper for background tasks (rolling memory, chat summary). Mirrors
// deepseekChat's shape so call sites can swap providers with a one-line change.
export async function anthropicChat(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  model?: string;
  onUsage?: (rawUsage: unknown) => void;
}): Promise<string> {
  return anthropicFetch(opts);
}
