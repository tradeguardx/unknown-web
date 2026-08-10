// POST /api/date/tts  { text, gender?, voiceId? }
// Proxies ElevenLabs text-to-speech and streams back audio/mpeg so the browser
// can play the persona's line. The API key stays server-side. Voice is chosen by
// an explicit (real) voiceId, else a gender default (both overridable via env).

import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Fallbacks only — normally the per-persona voiceId (from the gender pool) is used.
const FEMALE = process.env.ELEVENLABS_VOICE_FEMALE || "EVy5l1wEi54nXdQwAJJf";
const MALE = process.env.ELEVENLABS_VOICE_MALE || "q8LPG9jwtX7MRuAmvkLs";
// Flash = lowest latency (best for a live call). Override with ELEVENLABS_MODEL
// (e.g. eleven_turbo_v2_5 / eleven_multilingual_v2) if you want more expressiveness.
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";
const MATCH_API = process.env.MATCH_API_URL || "https://api.unknown.chat/match";

// She should SAY her words, not narrate stage directions. Strip *actions*, bracket
// tags and emojis so ElevenLabs voices only the real dialogue (natural laughter
// like "haha" is kept — the voice performs it).
function cleanForSpeech(raw: string): string {
  return raw
    .replace(/\*[^*]*\*/g, " ")        // *small smile*, *leans in*
    .replace(/\[[^\]]*\]/g, " ")       // [laughs] style tags
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu, " ") // emojis/symbols
    .replace(/\s+([,.!?…])/g, "$1")    // tidy spaces before punctuation
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ error: "VOICE_NOT_CONFIGURED" }, { status: 501 });

  const { text, gender, voiceId, stability, style, conversationId } = await req.json().catch(() => ({}));
  const clean = cleanForSpeech(String(text ?? "")).slice(0, 900);
  if (!clean) return NextResponse.json({ error: "text required" }, { status: 400 });

  // Server-authoritative voice gate: 7 free voice minutes per date (measured on
  // the conversation row), then paid-only. A refresh can't reset it.
  const auth = req.headers.get("authorization") ?? "";
  if (conversationId && auth.startsWith("Bearer ")) {
    try {
      const vc = await fetch(`${MATCH_API}/conversations/${conversationId}/voice-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
      });
      const j = await vc.json().catch(() => ({}));
      const data = j.data ?? j;
      if (vc.ok && data && data.allowed === false) {
        return NextResponse.json({ error: "VOICE_CAPPED", remainingSec: data.remainingSec ?? 0 }, { status: 402 });
      }
    } catch {
      /* fail-open: if the gate is unreachable, don't break the call */
    }
  }

  // Use the per-persona voice id (from the gender pool); fall back by gender.
  const realVoice = typeof voiceId === "string" && !voiceId.startsWith("eleven_") ? voiceId : null;
  const vid = realVoice || (gender === "male" ? MALE : FEMALE);

  const clamp = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 1 ? v : d);

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream?optimize_streaming_latency=3`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: clean,
      model_id: MODEL,
      // per-persona settings tune emotiveness/character to personality
      voice_settings: {
        stability: clamp(stability, 0.45),
        similarity_boost: 0.85,
        style: clamp(style, 0.3),
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok || !res.body) {
    const raw = await res.text().catch(() => "");
    let message = raw.slice(0, 400);
    try {
      const j = JSON.parse(raw);
      message = j?.detail?.message || j?.detail?.status || j?.detail || message;
    } catch {/* keep raw */}
    console.warn("[tts] elevenlabs", res.status, message);
    return NextResponse.json({ error: "TTS_FAILED", status: res.status, message }, { status: 502 });
  }

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
