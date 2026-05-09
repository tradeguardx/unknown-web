// POST /api/chat/start
// Body: { prefs?: UserPrefs }
// Creates a new session with a fresh random persona biased by the user's prefs.
// Returns sessionId, plus an opener (text + pacing) if the persona decided to speak first.

import { NextResponse } from "next/server";
import { createSession, appendMessage } from "@/lib/sessions";
import { pickFirstMessage } from "@/lib/persona";
import { computePacing } from "@/lib/pacing";
import { intentRequiresAgeGate, type UserPrefs } from "@/lib/prefs";

export const runtime = "nodejs";

interface StartBody {
  prefs?: UserPrefs;
}

export async function POST(req: Request) {
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

  const session = createSession(body.prefs);

  // Whether the persona starts is determined by the persona's mood (set in the generator).
  // chatty/flirty open often, shy/grumpy rarely. This makes "user types first" actually common.
  const personaStarts = Math.random() < session.persona.startsConversationProbability;

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
    debug: process.env.NODE_ENV === "development" ? { persona: session.persona } : undefined,
  });
}
