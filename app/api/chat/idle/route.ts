// POST /api/chat/idle
// Body: { sessionId, silenceMs }
// Called by the client when the user has been quiet for a while.
// The persona decides: ping, leave, or stay quiet — based on its mood + history.
//
// Same response shape as /send so the client can render messages identically.

import { NextResponse } from "next/server";
import { appendMessage, endSession, getSession } from "@/lib/sessions";
import { parseReply, type PacedMessage } from "@/lib/replyParser";
import { callLLM, trimHistory } from "@/lib/llmProvider";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

interface IdleBody {
  sessionId?: string;
  silenceMs?: number;
}

export async function POST(req: Request) {
  // 30 idle pokes per minute per IP. Should never happen in normal use (client
  // only fires every 45–90s), so this is just an abuse cap.
  const limit = rateLimit(clientIp(req), 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate limit", retryAfterMs: limit.retryAfterMs },
      { status: 429, headers: { "Retry-After": Math.ceil(limit.retryAfterMs / 1000).toString() } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as IdleBody;
  const { sessionId, silenceMs } = body;

  if (!sessionId || typeof silenceMs !== "number" || silenceMs < 0) {
    return NextResponse.json({ error: "sessionId and silenceMs required" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });
  if (session.ended) return NextResponse.json({ error: "session ended", reason: session.endReason }, { status: 410 });

  // The persona must SEE that the user went silent. We inject this as a synthetic
  // user-role message, marked as a system note. The system prompt explains the convention.
  const seconds = Math.round(silenceMs / 1000);
  const idleMarker = `[the user has been silent for ${seconds}s]`;

  const llmMessages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...trimHistory(session.messages).map(m => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: idleMarker },
  ];

  let raw: string;
  try {
    raw = await callLLM({
      persona: session.persona,
      prefs: session.prefs,
      userMemory: session.userMemory,
      messages: llmMessages,
      maxTokens: 128,
      provider: session.provider,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[llm error]", msg);
    const body =
      process.env.NODE_ENV === "development"
        ? { error: "upstream error", detail: msg }
        : { error: "upstream error" };
    return NextResponse.json(body, { status: 502 });
  }

  const parsed = parseReply(session.persona, raw);

  if (parsed.stay) {
    return NextResponse.json({
      messages: [] as PacedMessage[],
      left: false,
      stay: true,
    });
  }

  // Commit poke messages to history so future replies remain coherent.
  let cursor = Date.now();
  for (const m of parsed.messages) {
    cursor += m.preTypingMs + m.totalMs;
    appendMessage(sessionId, { role: "assistant", content: m.text, ts: cursor });
  }

  if (parsed.left) endSession(sessionId, parsed.leaveReason || "silent");

  return NextResponse.json({
    messages: parsed.messages,
    left: parsed.left,
    reason: parsed.left ? parsed.leaveReason : undefined,
    stay: false,
  });
}
