// POST /api/date/finish  { conversationId, personaId, sceneId?, language?, messages }
// End an AI Date: run the Result engine (Dating Report) on the transcript, then
// store it via the match-service (which gates teaser vs full at read time). Report
// generation runs SERVER-SIDE here — it needs the DeepSeek/Sarvam keys and the
// result-engine registry, neither of which belongs in the browser.

import { NextResponse } from "next/server";
import { getExperience } from "@/lib/experiences/experiences";
import { getScene } from "@/lib/experiences/scenes";
import { getCuratedPersona } from "@/lib/experiences/personas";
import { runResult } from "@/lib/experiences/result";
import type { ResultContext } from "@/lib/experiences/types";

const MATCH_API = process.env.MATCH_API_URL || "https://api.unknown.chat/match";

type InMsg = { role: string; content: string };

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { conversationId, personaId, sceneId, language } = body;
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  const seed = personaId ? getCuratedPersona(String(personaId)) : null;
  if (!seed) return NextResponse.json({ error: "unknown persona" }, { status: 400 });

  const experience = getExperience("first_date");
  if (!experience) return NextResponse.json({ error: "experience unavailable" }, { status: 500 });
  const scene = getScene(String(sceneId || seed.defaultSceneId)) ?? undefined;

  // Only real user/assistant turns feed the scorer.
  const messages = (Array.isArray(body.messages) ? (body.messages as InMsg[]) : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  if (messages.filter((m) => m.role === "user").length < 3) {
    return NextResponse.json({ error: "TOO_SHORT", message: "the date was too short to score" }, { status: 422 });
  }

  const ctx: ResultContext = {
    experience,
    scene,
    persona: {
      name: seed.design.name ?? seed.occupation,
      age: seed.design.age ?? 25,
      gender: seed.design.gender,
    },
    messages,
    language: typeof language === "string" ? language : seed.design.language,
  };

  const report = await runResult(ctx);
  if (!report) {
    return NextResponse.json({ error: "REPORT_FAILED", message: "couldn't generate the report" }, { status: 502 });
  }

  const meta = {
    personaName: seed.design.name,
    personaOccupation: seed.occupation,
    avatarId: seed.avatarId,
    sceneId: scene?.id ?? null,
    sceneEmoji: scene?.emoji ?? "💘",
  };

  const res = await fetch(`${MATCH_API}/conversations/${conversationId}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({
      experienceType: experience.id,
      resultType: experience.resultType,
      resultJson: report,
      meta,
    }),
  });
  const stored = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(stored, { status: res.status });
  const data = stored.data ?? stored;

  return NextResponse.json({ resultId: data.resultId });
}
