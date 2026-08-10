// GET /api/date/config — the picker data for the AI Date experience: the
// experience(s), the scenes, and lightweight persona CARDS. Persona INTERNALS
// (sliders/system/backstory) never ship to the browser — only public-facing
// fields (name/age/occupation/avatar/tags/default scene).

import { NextResponse } from "next/server";
import { listExperiences } from "@/lib/experiences/experiences";
import { listScenes } from "@/lib/experiences/scenes";
import { CURATED_PERSONAS, PERSONA_VOICES, pickVoiceId } from "@/lib/experiences/personas";

export const dynamic = "force-dynamic";

const MEDIA = "https://eppdibglxxapupwgssxu.supabase.co/storage/v1/object/public/media";

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
    label: s.label,
    subtitle: s.subtitle,
    location: s.location,
    time: s.time,
    weather: s.weather,
    ambience: s.ambience,
    sound: s.sound,
    howItChanges: s.howItChanges,
    visualTheme: s.visualTheme,
    darkTheme: s.darkTheme,
    backgroundSounds: s.backgroundSounds,
    emoji: s.emoji,
    cardImage: s.cardImage ?? null,
    ambientAudio: `${MEDIA}/amb_${s.id}.mp3`,
  }));

  const personas = CURATED_PERSONAS.map((p) => ({
    id: p.id,
    name: p.design.name,
    age: p.design.age,
    gender: p.design.gender,
    occupation: p.occupation,
    avatarId: p.avatarId,
    photoUrl: p.photoUrl ?? null,
    defaultSceneId: p.defaultSceneId,
    archetypeLabel: p.archetypeLabel,
    traits: p.traits,
    quote: p.quote,
    chips: p.chips,
    vibe: p.vibe,
    stripeColor: p.stripeColor,
    tags: p.tags ?? [],
    voiceId: pickVoiceId(p.id, p.design.gender),
    voiceStability: PERSONA_VOICES[p.id]?.stability ?? null,
    voiceStyle: PERSONA_VOICES[p.id]?.style ?? null,
  }));

  return NextResponse.json({ experiences, scenes, personas });
}
