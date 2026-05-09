// Groq client. Groq's chat-completions endpoint is OpenAI-compatible, so we
// hit it via fetch — no SDK needed.
//
// Why Groq for the free tier:
//   - ~10x faster inference (their custom LPU hardware)
//   - Generous free quota: 30 RPM, ~14k TPM, 100k requests/day on
//     llama-3.3-70b-versatile
//
// The full Claude-equivalent prompt lives in lib/promptsGroq.ts. Llama 3.3 70B
// handles the longer prompt fine, so persona quality should be close to Claude
// for the same persona generator output.

const GROQ_BASE = "https://api.groq.com/openai/v1";

export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

interface GroqChoice {
  message?: { role: string; content: string };
}

interface GroqResponse {
  choices?: GroqChoice[];
  error?: { message: string; type?: string; code?: string };
}

export async function groqChat(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.system },
        ...opts.messages,
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as GroqResponse;
  if (data.error) {
    throw new Error(`Groq error: ${data.error.message}`);
  }
  return data.choices?.[0]?.message?.content ?? "";
}
