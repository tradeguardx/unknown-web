// POST /api/chat/send
// Body: { sessionId, message }
// Calls Claude with the persona system prompt + history. The reply may be split into
// 1–3 short bursts (the prompt instructs Claude to use \n for natural multi-message replies).
// Returns an array of PacedMessage so the client can animate each one.

import { NextResponse } from "next/server";
import { appendMessage, endSession, getSession } from "@/lib/sessions";
import { buildSystemPrompt } from "@/lib/prompts";
import { parseReply, type PacedMessage } from "@/lib/replyParser";
import { getAnthropic, MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 30;

interface SendBody {
  sessionId?: string;
  message?: string;
}

export async function POST(req: Request) {
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

  const system = buildSystemPrompt(session.persona, session.prefs);
  const claudeMessages = session.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let raw: string;
  try {
    const resp = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 256,
      system,
      messages: claudeMessages,
    });
    const block = resp.content.find(b => b.type === "text");
    raw = block && block.type === "text" ? block.text : "";
  } catch (err) {
    console.error("anthropic error", err);
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
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
