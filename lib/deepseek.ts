// DeepSeek client. DeepSeek's chat-completions endpoint is OpenAI-compatible,
// so we hit it via fetch — no SDK needed.
//
// Why DeepSeek as the alternative provider:
//   - Genuinely cheap ($0.27/M input, $0.07/M cached, $1.10/M output)
//   - Quality competitive with mid-tier Claude on most tasks
//   - Less reflexive refusal on flirty/adult content than Llama base
//   - Stronger multilingual (especially Hindi, Japanese, Korean, Chinese)
//   - No tight free-tier TPM walls — pay-as-you-go from request 1
//
// Used for two things in this app:
//   1. Chat replies when LLM_PROVIDER=deepseek (alternative to Anthropic)
//   2. Memory extraction (always, when DEEPSEEK_API_KEY is set), regardless
//      of which provider serves chat. Same model — DeepSeek doesn't have a
//      smaller/cheaper variant for extraction, but it's already cheap enough.
//
// Caching: DeepSeek supports automatic context caching with no code changes.
// Repeated prefixes (our system prompt) get billed at the cache-hit rate.

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

// For memory extraction, we use the same chat model since DeepSeek doesn't
// expose a smaller variant. Override via env if you want to try R1 (more
// expensive, reasoning-tuned — overkill for extraction).
export const DEEPSEEK_EXTRACT_MODEL =
  process.env.DEEPSEEK_EXTRACT_MODEL || "deepseek-chat";

export function isDeepSeekAvailable(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

interface DeepSeekChoice {
  message?: { role: string; content: string };
}

interface DeepSeekResponse {
  choices?: DeepSeekChoice[];
  usage?: unknown;
  error?: { message: string; type?: string; code?: string };
}

export async function deepseekChat(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  model?: string;
  onUsage?: (rawUsage: unknown) => void;
}): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set");

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model || DEEPSEEK_MODEL,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.system },
        ...opts.messages,
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`DeepSeek ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as DeepSeekResponse;
  if (data.error) {
    throw new Error(`DeepSeek error: ${data.error.message}`);
  }
  if (data.usage) opts.onUsage?.(data.usage);
  return data.choices?.[0]?.message?.content ?? "";
}
