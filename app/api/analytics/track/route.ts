// POST /api/analytics/track
// Body: { type: "pageview", path: string, ref?: string }
//
// The browser posts page views here; the server enriches each with the visitor
// hash, geo country, and referrer-derived origin (all from request headers the
// client can't forge) and forwards to SQS. Keeping this server-side means no AWS
// credentials ever reach the browser, and origin/country are trustworthy.
//
// Only "pageview" is accepted from the client — every other event type is
// produced server-side from trusted session state, so we don't let arbitrary
// client events into the pipeline.

import { NextResponse } from "next/server";
import { emitPageview, isAnalyticsEnabled } from "@/lib/events";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface TrackBody {
  type?: string;
  path?: string;
  ref?: string;
}

export async function POST(req: Request) {
  // No-op fast path when the pipeline isn't configured (local dev).
  if (!isAnalyticsEnabled()) return NextResponse.json({ ok: true });

  // Cheap abuse cap — a real client fires at most a handful of pageviews/min.
  const limit = rateLimit(`pv:${clientIp(req)}`, 120, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: true }); // swallow, never error the page

  const body = (await req.json().catch(() => ({}))) as TrackBody;

  if (body.type !== "pageview" || typeof body.path !== "string" || !body.path) {
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  }

  // Normalize the path: keep it low-cardinality (drop query/hash, cap length).
  const path = body.path.split(/[?#]/)[0].slice(0, 200) || "/";
  const ref = typeof body.ref === "string" ? body.ref.slice(0, 500) : undefined;

  void emitPageview(req, path, ref);
  return NextResponse.json({ ok: true });
}
