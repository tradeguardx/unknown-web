// POST /api/chat/end
// Body: { sessionId: string, reason?: string }
//
// Client-initiated end. The server only "sees" the ends it processes itself
// (persona leaves, idle, policy). When the USER ends a chat — taps skip/new, or
// leaves the page — nothing server-side knew. This endpoint closes that gap so
// duration buckets and chat summaries capture user-initiated exits too.
//
// Idempotent: ending an already-ended session just no-ops on the analytics side
// (onChatEnded de-dupes via session.closeRecorded).

import { NextResponse } from "next/server";
import { endSession, getSession } from "@/lib/sessions";
import { onChatEnded } from "@/lib/chatClose";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface EndBody {
  sessionId?: string;
  reason?: string;
}

// Reasons the client is allowed to assert. Anything else collapses to "user_left"
// so we don't let arbitrary strings explode the end-reason dimension.
const ALLOWED_REASONS = new Set(["skip", "page_leave", "user_left"]);

export async function POST(req: Request) {
  const limit = rateLimit(`end:${clientIp(req)}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => ({}))) as EndBody;
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = getSession(body.sessionId);
  // Unknown or already-recorded session → nothing to do, but never error: this
  // is often called from a page-unload beacon where the response is ignored.
  if (!session || session.closeRecorded) return NextResponse.json({ ok: true });

  const reason =
    body.reason && ALLOWED_REASONS.has(body.reason) ? body.reason : "user_left";

  if (!session.ended) endSession(session.id, reason);
  onChatEnded(req, session, reason);

  return NextResponse.json({ ok: true });
}
