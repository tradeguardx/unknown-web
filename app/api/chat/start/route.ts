// POST /api/chat/start
// Body: { prefs?: UserPrefs }
// Creates a new session with a fresh random persona biased by the user's prefs.
// Returns sessionId, plus an opener (text + pacing) if the persona decided to speak first.

import { NextResponse } from "next/server";
import { createSession, appendMessage } from "@/lib/sessions";
import { pickFirstMessage, personaVibe } from "@/lib/persona";
import { computePacing } from "@/lib/pacing";
import { intentRequiresAgeGate, type UserPrefs } from "@/lib/prefs";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { isCaptchaEnabled, verifyTurnstileToken } from "@/lib/turnstile";
import {
  captchaRequired,
  recordChatStart,
  resetAfterCaptcha,
} from "@/lib/captchaCounter";
import { emitChatStarted, countryFrom, visitorVid } from "@/lib/events";

export const runtime = "nodejs";

interface StartBody {
  prefs?: UserPrefs;
  captchaToken?: string;
}

export async function POST(req: Request) {
  const ip = clientIp(req);

  // 20 new chats per minute per IP — generous for human use, blocks bots.
  const limit = rateLimit(ip, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate limit", retryAfterMs: limit.retryAfterMs },
      { status: 429, headers: { "Retry-After": Math.ceil(limit.retryAfterMs / 1000).toString() } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as StartBody;

  // Every chat requires the user to have acknowledged that strangers are AI personas.
  // This is the TOS-compliance backstop — without it, the app could be considered "deceptive
  // about AI nature" under Anthropic's policy. Client form enforces it; server is the real check.
  if (body.prefs?.aiAcknowledged !== true) {
    return NextResponse.json(
      { error: "AI persona acknowledgment required" },
      { status: 403 },
    );
  }

  // Gate adult-coded intents behind 18+ self-attestation. Client also enforces this in the
  // form, but the server check is the real protection — a client-bypass attempt with the
  // intent set to flirt/love but ageConfirmed=false will get 403 here.
  if (intentRequiresAgeGate(body.prefs?.intent) && body.prefs?.ageConfirmed !== true) {
    return NextResponse.json(
      { error: "age confirmation required for this intent" },
      { status: 403 },
    );
  }

  // CAPTCHA gating: every Nth chat per IP demands a Turnstile token.
  // Disabled if TURNSTILE_SECRET_KEY isn't configured — safe for local dev.
  if (isCaptchaEnabled() && captchaRequired(ip)) {
    const token = body.captchaToken;
    if (!token) {
      return NextResponse.json(
        { error: "captcha required", code: "captcha_required" },
        { status: 403 },
      );
    }
    const ok = await verifyTurnstileToken(token, ip);
    if (!ok) {
      return NextResponse.json(
        { error: "captcha verification failed", code: "captcha_failed" },
        { status: 403 },
      );
    }
    resetAfterCaptcha(ip);
  }

  recordChatStart(ip);

  const session = createSession(body.prefs);
  // Snapshot analytics context so the reaper can close + summarize this chat
  // later without an HTTP request (if the user just closes the tab).
  session.country = countryFrom(req);
  session.vid = visitorVid(req);

  // Owned analytics pipeline: funnel (chat_started → chat_ended) with rich
  // dimensions, lands in our own store.
  void emitChatStarted(req, session);

  // The user ALWAYS sends the first message — so they always get the opener
  // starters ("say something first" + "set your vibe") and can set the tone
  // before the persona replies. (Persona-opens-first is disabled on purpose; it
  // pre-empted the vibe-setting step.)
  const personaStarts = false;

  let opener:
    | { willSendFirst: true; text: string; delayMs: number; preTypingMs: number }
    | { willSendFirst: false } = { willSendFirst: false };

  if (personaStarts) {
    const text = pickFirstMessage(session.persona, body.prefs?.intent);
    const pacing = computePacing(session.persona, text);
    appendMessage(session.id, { role: "assistant", content: text, ts: Date.now() + pacing.totalMs });
    opener = {
      willSendFirst: true,
      text,
      delayMs: pacing.totalMs,
      preTypingMs: pacing.preTypingMs,
    };
  }

  return NextResponse.json({
    sessionId: session.id,
    opener,
    vibe: personaVibe(session.persona),
    debug: process.env.NODE_ENV === "development" ? { persona: session.persona } : undefined,
  });
}
