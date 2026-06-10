// POST /api/chat/send
// Body: { sessionId, message }
// Calls the active LLM provider (Anthropic or DeepSeek, per LLM_PROVIDER env)
// with the persona system prompt + history. The reply may be split into
// 1–3 short bursts (the prompt instructs the model to use \n for natural multi-message replies).
// Returns an array of PacedMessage so the client can animate each one.

import { NextResponse } from "next/server";
import {
  appendMessage,
  endSession,
  getRecentUserMessages,
  getSession,
  incrementWarning,
  resetSilentPing,
  touchSession,
} from "@/lib/sessions";
import { parseReply, type PacedMessage } from "@/lib/replyParser";
import { callLLM, trimHistory } from "@/lib/llmProvider";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { checkContent, getCloseText } from "@/lib/contentFilter";
import { refreshUserMemory, shouldRefreshMemory } from "@/lib/userMemory";
import { emitContentFilter } from "@/lib/events";
import { onChatEnded } from "@/lib/chatClose";

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

  // Max conversation length before we force-close. Counts total stored messages,
  // which includes the persona's burst bubbles (one reply → several stored msgs),
  // so 500 ≈ ~60-125 real exchanges depending on how much the persona bursts.
  if (session.messages.length >= 500) {
    endSession(sessionId, "too long");
    onChatEnded(req, session, "too_long");
    return NextResponse.json({ error: "session ended", reason: "too long" }, { status: 410 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "message too long" }, { status: 413 });
  }

  // Defense-in-depth content enforcement. Three severities:
  //   - close: CSAM, threats, drug dealing, minor-in-adult-mode, spam, repeat offenders → end session
  //   - warn:  sexual demands, abuse, slurs → first hit returns a system warning, second hit closes
  //   - ok:    let it through to the LLM
  const filter = checkContent({
    text: message,
    intent: session.prefs?.intent,
    warningCount: session.warningCount,
    recentUserMessages: getRecentUserMessages(sessionId, 5),
  });

  if (filter.severity === "close") {
    console.error(
      "[content-filter] closed session",
      JSON.stringify({
        sessionId,
        reason: filter.reason,
        intent: session.prefs?.intent,
        warningCount: session.warningCount,
        sample: message.slice(0, 80),
      }),
    );
    endSession(sessionId, filter.reason || "policy");
    void emitContentFilter(req, session, "close", filter.reason || "unknown", session.warningCount);
    onChatEnded(req, session, `policy:${filter.reason || "unknown"}`);
    return NextResponse.json(
      {
        error: "content policy violation",
        reason: filter.reason,
        code: "content_policy",
        closeText: getCloseText(filter.reason || ""),
      },
      { status: 451 },
    );
  }

  if (filter.severity === "warn") {
    const newCount = incrementWarning(sessionId);
    console.warn(
      "[content-filter] warned",
      JSON.stringify({
        sessionId,
        reason: filter.reason,
        warningCount: newCount,
        sample: message.slice(0, 80),
      }),
    );
    void emitContentFilter(req, session, "warn", filter.reason || "unknown", newCount);
    // Warning is delivered as a synthetic system message — UI renders distinctly.
    // We do NOT append it to session.messages or send it to the LLM; this is purely
    // a server→client signal so the chat does not break flow with the persona.
    return NextResponse.json({
      messages: [] as PacedMessage[],
      left: false,
      warning: {
        text: filter.warningText,
        reason: filter.reason,
        count: newCount,
      },
    });
  }

  appendMessage(sessionId, { role: "user", content: message, ts: Date.now() });
  touchSession(sessionId); // alive — don't let the reaper close it
  // User just spoke — reset the impatience counter so the persona's next idle
  // poll starts fresh from "ping" instead of "force-leave".
  resetSilentPing(sessionId);

  // Random "stranger ghosted before reading" outcome — small chance the user just gets dropped.
  if (Math.random() < session.persona.randomLeaveProbability * 0.4) {
    endSession(sessionId, "ghosted");
    onChatEnded(req, session, "ghosted");
    return NextResponse.json({
      messages: [] as PacedMessage[],
      left: true,
      reason: "ghosted",
      // Empty messages but the client should wait this long before showing the disconnect notice,
      // so it feels like the stranger was thinking and then bailed.
      leaveDelayMs: 4_000 + Math.floor(Math.random() * 8_000),
    });
  }

  const llmMessages = trimHistory(session.messages).map(m => ({
    role: m.role,
    content: m.content,
  }));

  let raw: string;
  try {
    raw = await callLLM({
      persona: session.persona,
      prefs: session.prefs,
      userMemory: session.userMemory,
      messages: llmMessages,
      maxTokens: 256,
      provider: session.provider,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[llm error]", msg);

    // Detect upstream rate-limit (Anthropic 429, DeepSeek 429, etc.) and surface
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
    onChatEnded(req, session, parsed.leaveReason || "left");
  }

  // Fire-and-forget rolling memory refresh. Runs every Nth message (default 10),
  // uses DeepSeek's deepseek-chat — cheap and reliable structured output.
  // Doesn't block the user's reply. Next request picks up the updated memory.
  if (shouldRefreshMemory(session.messages.length)) {
    setImmediate(() => {
      refreshUserMemory({ sessionId }).catch(err =>
        console.warn("[userMemory refresh]", err instanceof Error ? err.message : String(err)),
      );
    });
  }

  return NextResponse.json({
    messages: parsed.messages,
    left: parsed.left,
    reason: parsed.left ? parsed.leaveReason : undefined,
  });
}
