// POST /api/chat/send
// Body: { sessionId, message }
// Calls the active LLM provider (Anthropic or Groq, per LLM_PROVIDER env)
// with the persona system prompt + history. The reply may be split into
// 1–3 short bursts (the prompt instructs the model to use \n for natural multi-message replies).
// Returns an array of PacedMessage so the client can animate each one.

import { NextResponse } from "next/server";
import { appendMessage, endSession, getSession } from "@/lib/sessions";
import { parseReply, type PacedMessage } from "@/lib/replyParser";
import { callLLM } from "@/lib/llmProvider";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { checkProhibitedContent } from "@/lib/contentFilter";

export const runtime = "nodejs";
export const maxDuration = 30;

interface SendBody {
  sessionId?: string;
  message?: string;
}

export async function POST(req: Request) {
  // 60 messages per minute per IP — generous (1/sec average), blocks abusive loops.
  // This is the main cost-control gate since each call hits the Anthropic API.
  const limit = rateLimit(clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate limit", retryAfterMs: limit.retryAfterMs },
      { status: 429, headers: { "Retry-After": Math.ceil(limit.retryAfterMs / 1000).toString() } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as SendBody;
  const { sessionId, message } = body;

  if (!sessionId || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "sessionId and non-empty message required" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  if (session.ended) {
    return NextResponse.json({ error: "session ended", reason: session.endReason }, { status: 410 });
  }

  if (session.messages.length >= 200) {
    endSession(sessionId, "too long");
    return NextResponse.json({ error: "session ended", reason: "too long" }, { status: 410 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "message too long" }, { status: 413 });
  }

  // Defense-in-depth content filter: refuse messages with CSAM-coded patterns
  // *before* they reach the model. End the session immediately on a hit.
  const filter = checkProhibitedContent(message, session.prefs?.intent);
  if (filter.blocked) {
    console.error(
      "[content-filter] blocked message",
      JSON.stringify({
        sessionId,
        reason: filter.reason,
        intent: session.prefs?.intent,
        sample: message.slice(0, 80),
      }),
    );
    endSession(sessionId, "policy");
    return NextResponse.json(
      { error: "content policy violation", reason: "policy", code: "content_policy" },
      { status: 451 },
    );
  }

  appendMessage(sessionId, { role: "user", content: message, ts: Date.now() });

  // Random "stranger ghosted before reading" outcome — small chance the user just gets dropped.
  if (Math.random() < session.persona.randomLeaveProbability * 0.4) {
    endSession(sessionId, "ghosted");
    return NextResponse.json({
      messages: [] as PacedMessage[],
      left: true,
      reason: "ghosted",
      // Empty messages but the client should wait this long before showing the disconnect notice,
      // so it feels like the stranger was thinking and then bailed.
      leaveDelayMs: 4_000 + Math.floor(Math.random() * 8_000),
    });
  }

  const llmMessages = session.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let raw: string;
  try {
    raw = await callLLM({
      persona: session.persona,
      prefs: session.prefs,
      messages: llmMessages,
      maxTokens: 256,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[llm error]", msg);

    // Detect upstream rate-limit (Groq TPD cap, Anthropic 429, etc.) and surface
    // a friendlier error code so the client can show a useful message instead of
    // a generic "something glitched".
    const isRateLimit = /\b(429|rate.?limit|tokens per day|TPD|TPM)\b/i.test(msg);
    if (isRateLimit) {
      return NextResponse.json(
        { error: "upstream rate limit", code: "upstream_rate_limit" },
        { status: 503 },
      );
    }

    // In dev, expose the upstream message so we don't have to alt-tab to the terminal.
    const body =
      process.env.NODE_ENV === "development"
        ? { error: "upstream error", detail: msg }
        : { error: "upstream error" };
    return NextResponse.json(body, { status: 502 });
  }

  const parsed = parseReply(session.persona, raw);

  // Append each delivered message to history (with offset timestamps so future
  // pacing calculations have a coherent timeline).
  let cursor = Date.now();
  for (const m of parsed.messages) {
    cursor += m.preTypingMs + m.totalMs;
    appendMessage(sessionId, { role: "assistant", content: m.text, ts: cursor });
  }

  if (parsed.left) {
    endSession(sessionId, parsed.leaveReason || "left");
  }

  return NextResponse.json({
    messages: parsed.messages,
    left: parsed.left,
    reason: parsed.left ? parsed.leaveReason : undefined,
  });
}
