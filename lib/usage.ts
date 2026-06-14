// Token-usage instrumentation. Every provider returns a `usage` block; we
// normalize it, accumulate per-provider per-session, and estimate $ cost so the
// analytics pipeline can show where the AI spend actually goes.
//
// Normalization unifies two billing conventions:
//   - Anthropic: input_tokens is ALREADY the non-cached portion; cache_read /
//     cache_creation are separate, additive counters.
//   - OpenAI-compatible (DeepSeek/Sarvam): prompt_tokens is the TOTAL input;
//     the cached subset (prompt_cache_hit_tokens) is billed cheaper. So we set
//     input = prompt_tokens - cacheRead to match Anthropic's "full-price input".

export interface TokenUsage {
  input: number; // billed at full input rate
  output: number;
  cacheRead: number; // cached input (cheap)
  cacheWrite: number; // cache-creation (premium; Anthropic only)
}

export type ProviderUsage = Record<string, TokenUsage>;

const ZERO: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

// $ per 1M tokens. APPROXIMATE — tune as provider pricing changes. Anthropic =
// Haiku 4.5 ($1 in / $5 out, cache read 0.1×, cache write 1.25×). DeepSeek and
// Sarvam are rough public/estimated rates; the point is relative cost + trend.
const PRICES: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  anthropic: { in: 1.0, out: 5.0, cacheRead: 0.1, cacheWrite: 1.25 },
  deepseek: { in: 0.27, out: 1.1, cacheRead: 0.027, cacheWrite: 0.27 },
  sarvam: { in: 0.6, out: 2.0, cacheRead: 0.6, cacheWrite: 0.6 },
};

// Raw provider usage → normalized TokenUsage.
export function normalizeUsage(raw: unknown, provider: string): TokenUsage {
  const u = (raw ?? {}) as Record<string, number>;
  if (provider === "anthropic") {
    return {
      input: u.input_tokens ?? 0,
      output: u.output_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
    };
  }
  // OpenAI-compatible (deepseek / sarvam)
  const cacheRead = u.prompt_cache_hit_tokens ?? 0;
  const prompt = u.prompt_tokens ?? 0;
  return {
    input: Math.max(0, prompt - cacheRead),
    output: u.completion_tokens ?? 0,
    cacheRead,
    cacheWrite: 0,
  };
}

// Add one call's usage into a per-provider session accumulator (mutates).
export function addUsage(acc: ProviderUsage, provider: string, u: TokenUsage): void {
  const cur = acc[provider] ?? { ...ZERO };
  acc[provider] = {
    input: cur.input + u.input,
    output: cur.output + u.output,
    cacheRead: cur.cacheRead + u.cacheRead,
    cacheWrite: cur.cacheWrite + u.cacheWrite,
  };
}

function costOf(provider: string, u: TokenUsage): number {
  const p = PRICES[provider] ?? PRICES.anthropic;
  return (
    (u.input * p.in + u.output * p.out + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) /
    1_000_000
  );
}

// Flatten a session's per-provider usage into totals + estimated $ cost.
export function summarizeUsage(acc: ProviderUsage): {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estCostUsd: number;
} {
  let inputTokens = 0,
    outputTokens = 0,
    cacheReadTokens = 0,
    cacheWriteTokens = 0,
    estCostUsd = 0;
  for (const [provider, u] of Object.entries(acc)) {
    inputTokens += u.input;
    outputTokens += u.output;
    cacheReadTokens += u.cacheRead;
    cacheWriteTokens += u.cacheWrite;
    estCostUsd += costOf(provider, u);
  }
  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    estCostUsd: Math.round(estCostUsd * 1_000_000) / 1_000_000, // round to micro-$
  };
}
