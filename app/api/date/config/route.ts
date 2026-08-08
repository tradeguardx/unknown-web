// GET /api/date/config — the picker data for the AI Date experience: the
// experience(s), the scenes, and lightweight persona CARDS. Persona INTERNALS
// (sliders/system/backstory) never ship to the browser — only public-facing
// fields (name/age/occupation/avatar/tags/default scene).

import { NextResponse } from "next/server";
import { listExperiences } from "@/lib/experiences/experiences";
import { listScenes } from "@/lib/experiences/scenes";
import { CURATED_PERSONAS } from "@/lib/experiences/personas";

export const dynamic = "force-dynamic";

export async function GET() {
  const experiences = listExperiences().map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    objective: e.objective,
    durationSec: e.durationSec,
    modalities: e.modalities,
    entitlement: e.entitlement,
    minAge: e.minAge ?? null,
  }));

  const scenes = listScenes().map((s) => ({
    id: s.id,
    location: s.location,
    time: s.time,
    weather: s.weather,
    ambience: s.ambience,
    visualTheme: s.visualTheme,
    backgroundSounds: s.backgroundSounds,
    emoji: s.emoji,
  }));

  const personas = CURATED_PERSONAS.map((p) => ({
    id: p.id,
    name: p.design.name,
    age: p.design.age,
    gender: p.design.gender,
    occupation: p.occupation,
    avatarId: p.avatarId,
    defaultSceneId: p.defaultSceneId,
    tags: p.tags ?? [],
    // A one-line teaser from the authored backstory (public-safe hook).
    blurb: p.design.backstory ?? "",
  }));

  return NextResponse.json({ experiences, scenes, personas });
}
