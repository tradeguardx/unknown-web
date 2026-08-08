// Framework types for the AI Experience Platform. Experiences, Scenes, curated
// Personas, and Result engines are all DATA/CONFIG — adding a new experience is a
// new config entry + a rules block + a result engine, never an app rewrite.

import type { PartnerDesign } from "../persona";

// ── Experience: what the user is actually doing ──────────────────────────────
export interface ExperienceDef {
  id: string; // "first_date" | "debate" | "mystery" | ...
  name: string;
  description: string;
  objective: string;
  durationSec: number; // soft session length (e.g. 900–1200 for a date)
  rules: string; // extra system-prompt block injected for this experience
  modalities: ("text" | "voice")[];
  resultType: string; // which Result engine to run at the end
  entitlement: "free" | "unknown_plus";
  minAge?: number; // age-gate (e.g. 18 for romance experiences)
}

// ── Scene / Environment: the place the experience happens ─────────────────────
export interface SceneDef {
  id: string; // "coffee_shop_snow" ...
  type: string;
  location: string;
  time: string;
  weather: string;
  ambience: string;
  backgroundSounds: string[]; // keys the client maps to ambient audio loops
  visualTheme: string; // key the client maps to a background/gradient
  emoji: string; // quick scene glyph for cards
  promptFlavor: string; // injected so the persona is IN the place
}

// ── Curated persona: an authored character for an experience ──────────────────
// Expressed as a PartnerDesign (reuses designPersona's slider→persona mapping) +
// authored extras. On session start it's expanded to a full Persona and frozen.
export interface CuratedPersona {
  id: string;
  design: PartnerDesign; // gender/age/sliders/traits/backstory/interests/style
  occupation: string;
  avatarId: string; // /public/avatars/<id>.svg (AI photos later)
  defaultSceneId: string;
  voiceId?: string; // provider-agnostic voice key (ElevenLabs etc.)
  tags?: string[]; // for browse/filter
}

// ── Result engine: per-experience structured outcome (extensible) ─────────────
export interface ResultContext {
  experience: ExperienceDef;
  scene?: SceneDef;
  persona: { name: string; age: number; gender: string };
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  language?: string;
  signals?: Record<string, unknown>; // behavioral metrics (Phase C)
  onUsage?: (raw: unknown, provider: string) => void;
}

export interface ResultEngine<T = unknown> {
  resultType: string;
  generate(ctx: ResultContext): Promise<T | null>;
}
