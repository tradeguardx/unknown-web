// POST /api/chat/heartbeat
// Body: { sessionId }
//
// The chat client pings this every ~20s while a chat is open. We forward a
// presence ping to the analytics service (server-side, with the ingest key) so
// the dashboard can show "people chatting right now". Fire-and-forget — the
// response returns immediately and never blocks the chat UI.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { sendPresence } from "@/lib/events";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface HeartbeatBody {
  sessionId?: string;
}

export async function POST(req: Request) {
  // Generous cap — a client beats every ~20s, so this only stops abuse.
  const limit = rateLimit(`hb:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => ({}))) as HeartbeatBody;
  if (!body.sessionId) return NextResponse.json({ ok: true });

  const session = getSession(body.sessionId);
  // Only count genuinely active chats.
  if (session && !session.ended) {
    void sendPresence(req, session.id);
  }
  return NextResponse.json({ ok: true });
}
