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

// Wrap the system prompt for prompt caching. The system prompt for any one
// session is identical across every turn (same persona) — so caching it makes
// every turn after the first cost ~10% of normal input pricing for that prefix.
//
// Default ephemeral cache TTL is 5 min, which comfortably covers the gap
// between active turns. If the user goes silent past 5 min, the next call
// rewrites the cache (one-time premium of 1.25x normal).
export function cachedSystem(text: string) {
  return [
    {
      type: "text" as const,
      text,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}
