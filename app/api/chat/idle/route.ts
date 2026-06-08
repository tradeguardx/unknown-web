// POST /api/chat/idle
// Body: { sessionId, silenceMs }
// Called by the client when the user has been quiet for a while.
// The persona decides: ping, leave, or stay quiet — based on its mood + history.
//
// Same response shape as /send so the client can render messages identically.

import { NextResponse } from "next/server";
import {
  appendMessage,
  endSession,
  getSession,
  incrementSilentPing,
  touchSession,
} from "@/lib/sessions";
import { parseReply, type PacedMessage } from "@/lib/replyParser";
import { callLLM, trimHistory } from "@/lib/llmProvider";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { onChatEnded } from "@/lib/chatClose";

// Cap on consecutive idle pings before we force the persona to leave. Real
// strangers don't keep poking; after 2 unanswered pings, the chat is over.
const MAX_SILENT_PINGS = 2;

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
  touchSession(sessionId); // client is still polling → chat is alive

  // Increment the impatience counter BEFORE we ask the LLM what to do. The
  // marker we inject tells the model how many times the user has already
  // been pinged this round — so it can pick the right response (silent leave,
  // proactive bye, etc.) without endlessly looping pings.
  const pingNumber = incrementSilentPing(sessionId);
  const seconds = Math.round(silenceMs / 1000);
  const forceLeave = pingNumber > MAX_SILENT_PINGS;

  // The persona must SEE that the user went silent. We inject this as a synthetic
  // user-role message, marked as a system note. The system prompt explains the convention.
  const idleMarker = forceLeave
    ? `[the user has been silent for ${seconds}s — this is ping #${pingNumber}, you must leave now: end your reply with [LEAVE: silent], optional one-line goodbye max]`
    : `[the user has been silent for ${seconds}s — this is your idle moment #${pingNumber} this round]`;

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

  // If the model emitted [STAY] but we'd already decided to force-leave, we
  // override the model — silence is silence, the chat ends. Otherwise pass
  // STAY through and let the client re-arm the idle timer.
  if (parsed.stay && !forceLeave) {
    return NextResponse.json({
      messages: [] as PacedMessage[],
      left: false,
      stay: true,
    });
  }
  if (parsed.stay && forceLeave) {
    endSession(sessionId, "silent");
    onChatEnded(req, session, "silent");
    return NextResponse.json({
      messages: [] as PacedMessage[],
      left: true,
      reason: "silent",
      stay: false,
    });
  }

  // Commit poke messages to history so future replies remain coherent.
  let cursor = Date.now();
  for (const m of parsed.messages) {
    cursor += m.preTypingMs + m.totalMs;
    appendMessage(sessionId, { role: "assistant", content: m.text, ts: cursor });
  }

  // Force-leave fallback: if we told the model to leave (forceLeave) but it
  // ignored the instruction and didn't emit [LEAVE: ...], end the session
  // server-side anyway. The persona's last messages still play out, the chat
  // just closes after.
  const shouldEnd = parsed.left || forceLeave;
  const leaveReason = parsed.leaveReason || "silent";
  if (shouldEnd) {
    endSession(sessionId, leaveReason);
    onChatEnded(req, session, leaveReason);
  }

  return NextResponse.json({
    messages: parsed.messages,
    left: shouldEnd,
    reason: shouldEnd ? leaveReason : undefined,
    stay: false,
  });
}
