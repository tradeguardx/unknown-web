// POST /api/date/voice-session
// Mints everything the browser needs to open a live ElevenLabs voice call for an
// AI Date: the 7-min free-window check (server-authoritative), a signed
// WebSocket URL for the shared date agent, and the per-persona overrides
// (spoken prompt + opener + voice). The ElevenLabs key stays server-side.

import { NextResponse } from "next/server";
import { buildVoiceOverrides } from "@/lib/experiences/voicePrompt";

export const runtime = "nodejs";

const MATCH_API = process.env.MATCH_API_URL || "https://api.unknown.chat/match";
const EL_BASE = "https://api.elevenlabs.io";

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_DATE_AGENT_ID;
  if (!key || !agentId) {
    return NextResponse.json({ error: "VOICE_NOT_CONFIGURED" }, { status: 501 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { conversationId, personaId, sceneId, language, age, weather, time, opener } =
    await req.json().catch(() => ({}));
  if (!conversationId || !personaId || !opener) {
    return NextResponse.json({ error: "conversationId, personaId and opener required" }, { status: 400 });
  }

  // Server-authoritative 7-min free voice window (per date). A refresh/reconnect
  // can't reset it — the cap is measured on the conversation row.
  let remainingSec: number | null = null;
  let paid = false;
  try {
    const vc = await fetch(`${MATCH_API}/conversations/${conversationId}/voice-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
    });
    const j = await vc.json().catch(() => ({}));
    const data = j.data ?? j;
    if (vc.ok && data) {
      paid = !!data.paid;
      remainingSec = typeof data.remainingSec === "number" ? data.remainingSec : null;
      if (data.allowed === false) {
        return NextResponse.json({ error: "VOICE_CAPPED", remainingSec: data.remainingSec ?? 0 }, { status: 402 });
      }
    }
  } catch {
    /* fail-open: if the gate is unreachable, still let the call start */
  }

  const overrides = buildVoiceOverrides({ personaId, sceneId, language, age, weather, time, opener });
  if (!overrides) {
    return NextResponse.json({ error: "unknown persona or experience" }, { status: 400 });
  }

  // Signed URL = short-lived WebSocket auth for this agent (browser never sees
  // the API key).
  const su = await fetch(`${EL_BASE}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { "xi-api-key": key },
  });
  if (!su.ok) {
    const raw = await su.text().catch(() => "");
    console.warn("[date/voice-session] signed-url", su.status, raw.slice(0, 300));
    return NextResponse.json({ error: "VOICE_SESSION_FAILED", status: su.status }, { status: 502 });
  }
  const suJson = await su.json().catch(() => ({}));
  const signedUrl = suJson.signed_url || suJson.signedUrl;
  if (!signedUrl) {
    return NextResponse.json({ error: "VOICE_SESSION_FAILED", message: "no signed url" }, { status: 502 });
  }

  return NextResponse.json({ signedUrl, overrides, remainingSec, paid });
}
