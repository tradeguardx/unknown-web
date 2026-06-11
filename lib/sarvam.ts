// Sarvam AI client (TEST/EVAL only — not wired into production routing).
//
// Sarvam is an India-built LLM tuned for Indian languages + code-mixing
// (Hinglish, Hindi, Punjabi, Tamil, …). Its /v1/chat/completions endpoint is
// OpenAI-compatible, so we hit it via fetch with the same shape as
// lib/deepseek.ts / lib/gemini.ts. Used to evaluate Sarvam across languages +
// personas on a local experiment branch.
//
// Tuning for OUR use case (casual texting personas, not an assistant):
//   - reasoning_effort: null → thinking mode OFF. We want fast, reflexive,
//     human-style replies — NOT chain-of-thought essays with reasoning_content.
//   - temperature: 0.85 → Sarvam's default 0.2 is robotic/repetitive; casual
//     human texting needs variety. Override via SARVAM_TEMPERATURE.
//   - wiki_grounding: false → personas are people, not encyclopedias; no factual
//     Wikipedia injection.
//
// Enable locally by setting in .env.local:
//   LLM_PROVIDER=sarvam
//   SARVAM_API_KEY=sk_...          (from the Sarvam dashboard)
//   SARVAM_MODEL=sarvam-105b       (optional; also sarvam-30b)

const SARVAM_BASE = process.env.SARVAM_BASE || "https://api.sarvam.ai/v1";

// sarvam-105b (flagship, 128K ctx) is the default — in our smoke tests it stayed
// in-character and concise, while sarvam-30b rambled and leaked an AI tell
// ("can't really do anything, just exist"). sarvam-30b (64K) is the cheaper
// fallback. NOTE: sarvam-m is fully deprecated and rejected by the API.
export const SARVAM_MODEL = process.env.SARVAM_MODEL || "sarvam-105b";

// Casual texting wants warmth + variety, not Sarvam's clinical 0.2 default.
const SARVAM_TEMPERATURE = Number(process.env.SARVAM_TEMPERATURE) || 0.85;

// Thinking mode (reasoning_effort) defaults OFF for snappy replies. Set
// SARVAM_REASONING_EFFORT=low|medium|high only to A/B test thinking quality.
const SARVAM_REASONING_EFFORT = process.env.SARVAM_REASONING_EFFORT || null;

export function isSarvamAvailable(): boolean {
  return !!process.env.SARVAM_API_KEY;
}

interface SarvamChoice {
  message?: { role: string; content: string; reasoning_content?: string };
  finish_reason?: string;
}
interface SarvamResponse {
  choices?: SarvamChoice[];
  error?: { message: string; code?: string };
}

export async function sarvamChat(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
  model?: string;
}): Promise<string> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY is not set");

  const res = await fetch(`${SARVAM_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model || SARVAM_MODEL,
      max_tokens: opts.maxTokens,
      temperature: SARVAM_TEMPERATURE,
      // null = thinking OFF (snappy texting). A string value turns it on.
      reasoning_effort: SARVAM_REASONING_EFFORT,
      wiki_grounding: false,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Sarvam ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as SarvamResponse;
  if (data.error) throw new Error(`Sarvam error: ${data.error.message}`);
  return data.choices?.[0]?.message?.content ?? "";
}
