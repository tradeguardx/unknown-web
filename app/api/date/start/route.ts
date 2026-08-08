// POST /api/date/start  { personaId, sceneId?, language? }
// Begin an AI Date: expand the curated persona, freeze the experience + scene
// into a new conversation (via the match-service), seed an in-scene opener, and
// return the ids + public persona/scene the client needs to render the date.
//
// Persona internals stay server-side — the match-service stores the full frozen
// persona; the browser only gets name/age/avatar/occupation + the scene.

import { NextResponse } from "next/server";
import { personaVibe } from "@/lib/persona";
import { getExperience } from "@/lib/experiences/experiences";
import { getScene } from "@/lib/experiences/scenes";
import { getCuratedPersona, buildCuratedPersona } from "@/lib/experiences/personas";

const MATCH_API = process.env.MATCH_API_URL || "https://api.unknown.chat/match";

// A warm, scene-aware first line so the user arrives INTO the date, not an empty
// box. Deterministic (no LLM call) — the persona takes over from turn two.
function buildOpener(name: string, sceneId: string): string {
  const openers: Record<string, string> = {
    coffee_shop_snow:
      "*looks up as you walk in, a little smile* hey — you found it. i grabbed us the table by the window, the snow looks unreal from here ❄️ what are you having?",
    rooftop_night:
      "*turns from the railing as you step out* oh hey — you made it up here. the view's kind of ridiculous, right? come stand where it's warmer 🌆",
    beach_sunset:
      "*glances over, pushing hair out of your face in the breeze* hey you. perfect timing — the sky's just starting to go gold. wanna walk a bit?",
    bookstore_rain:
      "*peeks around a shelf, holding a book* there you are. i may have gotten lost in here already 📚 it's pouring outside — good excuse to stay a while. hi.",
  };
  return openers[sceneId] ?? `hey — you made it. i'm ${name}. i've been kind of looking forward to this 🙂`;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { personaId, sceneId, language } = await req.json().catch(() => ({}));
  const seed = personaId ? getCuratedPersona(String(personaId)) : null;
  if (!seed) return NextResponse.json({ error: "unknown persona" }, { status: 400 });

  const experience = getExperience("first_date");
  if (!experience) return NextResponse.json({ error: "experience unavailable" }, { status: 500 });

  const resolvedSceneId = String(sceneId || seed.defaultSceneId);
  const scene = getScene(resolvedSceneId);
  if (!scene) return NextResponse.json({ error: "unknown scene" }, { status: 400 });

  const persona = buildCuratedPersona(seed);
  const lang = typeof language === "string" && language ? language : seed.design.language ?? "english";

  // The experience blob frozen into the conversation. The match-service reads
  // rules + scenePrompt from here to frame the chat (no cross-service config).
  const experienceBlob = {
    experienceId: experience.id,
    resultType: experience.resultType,
    sceneId: scene.id,
    rules: experience.rules,
    scenePrompt: scene.promptFlavor,
    durationSec: experience.durationSec,
  };

  const opener = buildOpener(persona.name, scene.id);

  const res = await fetch(`${MATCH_API}/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({
      persona: { ...persona, language: lang },
      displayName: persona.name,
      avatar: seed.avatarId,
      vibe: personaVibe(persona),
      experience: experienceBlob,
      transcript: [{ role: "assistant", content: opener }],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(body, { status: res.status });
  }
  const data = body.data ?? body;

  return NextResponse.json({
    matchId: data.match?.id,
    conversationId: data.conversationId,
    endsAt: data.endsAt ?? null,
    durationSec: experience.durationSec,
    opener,
    persona: {
      id: seed.id,
      name: persona.name,
      age: persona.age,
      gender: persona.gender,
      occupation: seed.occupation,
      avatarId: seed.avatarId,
    },
    scene: {
      id: scene.id,
      emoji: scene.emoji,
      visualTheme: scene.visualTheme,
      backgroundSounds: scene.backgroundSounds,
      location: scene.location,
      time: scene.time,
      weather: scene.weather,
    },
    language: lang,
  });
}
