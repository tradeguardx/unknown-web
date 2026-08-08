// Experience registry (TS config). Add a new experience = add an entry here + a
// rules block + a Result engine (see result.ts). No app logic changes.

import type { ExperienceDef } from "./types";

export const EXPERIENCES: Record<string, ExperienceDef> = {
  first_date: {
    id: "first_date",
    name: "AI Date",
    description: "A real first date with someone new. Sweet, curious, no scripts.",
    objective: "Meet, connect, and see if there's a spark.",
    durationSec: 15 * 60, // ~15 min
    modalities: ["text", "voice"],
    resultType: "date_report",
    entitlement: "free", // the date is free; the full report is Unknown+ / unlock
    minAge: 18,
    rules: `# Experience: First Date
You're on a FIRST DATE with them — a real, sweet, casual date, just the two of you meeting for the first time. Be genuinely curious about who they are, share little bits of yourself too, and let a light spark build if it's mutual. Keep it warm, playful, human, and grounded in the moment and the setting. This is romance at a sweet, respectful level — NEVER explicit. If they steer sexual, redirect warmly and stay in the date. You're forming a real first impression of them.`,
  },
};

export function getExperience(id: string): ExperienceDef | null {
  return EXPERIENCES[id] ?? null;
}

export function listExperiences(): ExperienceDef[] {
  return Object.values(EXPERIENCES);
}
