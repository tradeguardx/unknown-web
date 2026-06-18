// POST /api/match/keep  { sessionId }
// "Keep this one" → freeze the current chat's persona as a saved match.
//
// The full persona stays SERVER-SIDE (we never ship persona internals to the
// browser — that would break realism). We read it from the in-memory session and
// forward it to the match-service, passing the caller's Supabase Bearer token so
// the match is attributed to the right (possibly anonymous) user.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { personaVibe } from "@/lib/persona";

const MATCH_API = process.env.MATCH_API_URL || "https://api.unknown.chat/match";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { sessionId } = await req.json().catch(() => ({ sessionId: "" }));
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  // Carry over the conversation so far (last ~40 turns) so the matched chat
  // continues from where they left off instead of restarting empty.
  const transcript = session.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-40)
    .map((m) => ({ role: m.role, content: m.content }));

  // Freeze the full persona snapshot so the same person returns on resume.
  const res = await fetch(`${MATCH_API}/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({
      persona: session.persona,
      displayName: session.persona.name,
      vibe: personaVibe(session.persona),
      transcript,
    }),
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
