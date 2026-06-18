// POST /api/chat/feedback
// Body: { sessionId?, kind?, rating, text? }
//
// Stores user feedback — an emoji rating (1-5) plus an optional written review —
// via the analytics pipeline. Used after a chat ("chat_rating") and, later, for
// a general app review ("app_review"). Fire-and-forget on the analytics side.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { emitFeedback } from "@/lib/events";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface FeedbackBody {
  sessionId?: string;
  kind?: string;
  rating?: number;
  text?: string;
}

export async function POST(req: Request) {
  const limit = rateLimit(`fb:${clientIp(req)}`, 20, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => ({}))) as FeedbackBody;

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }

  const kind = body.kind === "app_review" ? "app_review" : "chat_rating";
  // Trim free-text; cap length so a single review can't blow up storage.
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : undefined;

  const session = body.sessionId ? await getSession(body.sessionId) : undefined;

  void emitFeedback(req, session, { kind, rating, text: text || undefined });
  return NextResponse.json({ ok: true });
}
