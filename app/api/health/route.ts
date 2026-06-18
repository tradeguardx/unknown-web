// GET /api/health — liveness probe for Fly rolling deploys.
//
// Fly hits this during a rolling deploy and waits for a 200 before routing
// traffic to the new machine and before moving on to restart the next one. That
// gating is what makes deploys zero-downtime: there's always a healthy machine
// serving (with shared Redis sessions) while the other is being replaced.
//
// Deliberately trivial — it must NOT depend on the LLM provider or anything that
// can be slow/flaky, or a transient upstream hiccup would fail the deploy. It's a
// "is this process up and serving HTTP" check, nothing more.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true });
}
