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
  const { conversationId, personaId, sceneId, language, elapsedSec, age } = body;
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
  // A real read needs a real conversation: ~10 min of discussion, or a long chat.
  const userTurns = messages.filter((m) => m.role === "user").length;
  const elapsed = typeof elapsedSec === "number" ? elapsedSec : 0;
  if (userTurns < 3 || (elapsed < 10 * 60 && userTurns < 12)) {
    return NextResponse.json({ error: "TOO_SHORT", message: "the date was too short to score — talk ~10 minutes" }, { status: 422 });
  }

  const ctx: ResultContext = {
    experience,
    scene,
    persona: {
      name: seed.design.name ?? seed.occupation,
      age: typeof age === "number" && age >= 18 ? Math.round(age) : seed.design.age ?? 25,
      gender: seed.design.gender,
    },
    messages,
    language: typeof language === "string" ? language : seed.design.language,
  };

  let report: unknown | null = null;
  try {
    report = await runResult(ctx);
  } catch (e) {
    console.error("[date/finish] report generation threw:", e);
    return NextResponse.json({ error: "REPORT_FAILED", message: `report error: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }
  if (!report) {
    console.warn("[date/finish] runResult returned null (LLM/JSON) — check DEEPSEEK/SARVAM keys reachable from the web app");
    return NextResponse.json({ error: "REPORT_FAILED", message: "couldn't generate the report (LLM returned nothing)" }, { status: 502 });
  }

  const meta = {
    personaName: seed.design.name,
    personaOccupation: seed.occupation,
    avatarId: seed.avatarId,
    photoUrl: seed.photoUrl ?? null,
    stripeColor: seed.stripeColor,
    archetypeLabel: seed.archetypeLabel,
    sceneId: scene?.id ?? null,
    sceneEmoji: scene?.emoji ?? "💘",
    sceneLabel: scene?.label ?? null,
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
  if (!res.ok) {
    console.error("[date/finish] store failed:", res.status, JSON.stringify(stored).slice(0, 300));
    return NextResponse.json(
      { error: "STORE_FAILED", message: stored?.error?.message || `store failed (${res.status})` },
      { status: res.status },
    );
  }
  const data = stored.data ?? stored;

  return NextResponse.json({ resultId: data.resultId });
}
