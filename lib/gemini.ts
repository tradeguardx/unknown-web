// Gemini client (TEST/EVAL only — not wired into production routing).
//
// Google's Gemini exposes an OpenAI-compatible chat-completions endpoint, so we
// hit it via fetch with the same shape as lib/deepseek.ts. Used to evaluate
// Gemini Flash Lite across languages + personas on a local/experiment branch.
//
// Enable locally by setting in .env.local:
//   LLM_PROVIDER=gemini
//   GEMINI_API_KEY=...           (from Google AI Studio)
//   GEMINI_MODEL=gemini-2.5-flash-lite   (optional override)

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

interface GeminiChoice {
  message?: { role: string; content: string };
}
interface GeminiResponse {
  choices?: GeminiChoice[];
  error?: { message: string; code?: number; status?: string };
}

export async function geminiChat(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  model?: string;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const res = await fetch(`${GEMINI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model || GEMINI_MODEL,
      max_tokens: opts.maxTokens,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);
  return data.choices?.[0]?.message?.content ?? "";
}
