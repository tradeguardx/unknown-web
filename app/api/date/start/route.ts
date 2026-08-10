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
const MEDIA = "https://eppdibglxxapupwgssxu.supabase.co/storage/v1/object/public/media";

// A warm, scene-aware first line so the user arrives INTO the date, not an empty
// box. Deterministic (no LLM call) — the persona takes over from turn two.
function buildOpener(name: string, sceneId: string): string {
  // Two strangers noticing each other — NOT a planned date. Curious, a little unsure.
  const openers: Record<string, string> = {
    coffee_shop:
      "*glances up as you sit down nearby* ...okay this is the only warm table in here and i'm not giving it up 😌 sorry — hi.",
    mountain_cabin:
      "*looks up from the fire, a little surprised* oh — hey. guess we're both stuck here till the snow lets up.",
    beach:
      "*looks over as you pass, pushing hair out of your face in the wind* hey. couldn't sleep either, huh.",
    rooftop:
      "*turns from the railing* oh — didn't think anyone else knew about this spot. the view's kind of unfair, right?",
    library:
      "*half-behind a shelf, almost a whisper* ...sorry, are you hiding in the good section too? hi.",
    night_train:
      "*glances up from the window as you take the seat across* long way to go, huh. ...hi.",
    campsite:
      "*looks up from the low fire* oh — hey. wasn't expecting anyone else out here tonight.",
    bookstore_rain:
      "*peeks around a shelf, holding a book* someone else waiting out the rain in here too 📚 hi.",
  };
  return openers[sceneId] ?? `*notices you, a small curious smile* ...hi. sorry — do i know you? no. i'd have remembered.`;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { personaId, sceneId, language, weather, time, age } = await req.json().catch(() => ({}));
  const seed = personaId ? getCuratedPersona(String(personaId)) : null;
  if (!seed) return NextResponse.json({ error: "unknown persona" }, { status: 400 });

  const experience = getExperience("first_date");
  if (!experience) return NextResponse.json({ error: "experience unavailable" }, { status: 500 });

  const resolvedSceneId = String(sceneId || seed.defaultSceneId);
  const scene = getScene(resolvedSceneId);
  if (!scene) return NextResponse.json({ error: "unknown scene" }, { status: 400 });

  const persona = buildCuratedPersona(seed);
  // Age adapts to the dater's chosen band — freeze it in so the AI plays that age.
  if (typeof age === "number" && age >= 18 && age <= 99) persona.age = Math.round(age);
  const lang = typeof language === "string" && language ? language : seed.design.language ?? "english";

  // Optional weather/time overrides from the scene picker → folded into the frozen
  // prompt so the persona reflects the exact conditions the user chose.
  const overrides: string[] = [];
  if (typeof weather === "string" && weather && weather !== scene.weather) overrides.push(`weather: ${weather}`);
  if (typeof time === "string" && time && time !== scene.time) overrides.push(`time: ${time}`);
  const scenePrompt = overrides.length ? `${scene.promptFlavor} (Right now: ${overrides.join(", ")}.)` : scene.promptFlavor;

  // The experience blob frozen into the conversation. The match-service reads
  // rules + scenePrompt from here to frame the chat (no cross-service config).
  const experienceBlob = {
    experienceId: experience.id,
    resultType: experience.resultType,
    sceneId: scene.id,
    rules: experience.rules,
    scenePrompt,
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
      label: scene.label,
      subtitle: scene.subtitle,
      visualTheme: scene.visualTheme,
      darkTheme: scene.darkTheme,
      backgroundSounds: scene.backgroundSounds,
      ambientAudio: `${MEDIA}/amb_${scene.id}.mp3`,
      location: scene.location,
      time: scene.time,
      weather: scene.weather,
      sound: scene.sound,
    },
    language: lang,
  });
}
