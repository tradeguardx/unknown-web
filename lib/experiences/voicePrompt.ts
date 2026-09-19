// Builds the ElevenLabs Conversational AI session overrides for one AI Date:
// the spoken system prompt (persona + scene + rules), the opener as the agent's
// first message, the per-persona voice, and the language. One shared agent is
// personalized per call entirely through these overrides.
//
// Server-only — it reads persona internals (rules/personality) that never ship
// to the browser except, necessarily, inside the prompt we hand to the SDK.

import { getExperience } from "./experiences";
import { getScene } from "./scenes";
import { getCuratedPersona, pickVoiceId } from "./personas";

// unknown.chat languages → ElevenLabs ISO codes.
const LANG_CODE: Record<string, string> = {
  english: "en",
  hindi: "hi",
  hinglish: "hi",
  spanish: "es",
  portuguese: "pt",
  french: "fr",
  german: "de",
  italian: "it",
  indonesian: "id",
  tagalog: "tl",
  arabic: "ar",
  japanese: "ja",
  korean: "ko",
};

const WEATHER_WORD: Record<string, string> = {
  snow: "snowing", rain: "raining", storm: "storming", fog: "foggy", clear: "clear",
};

export interface VoiceOverrideParams {
  personaId: string;
  sceneId?: string;
  language?: string;
  age?: number;
  weather?: string;
  time?: string;
  opener: string;
}

export interface VoiceOverrides {
  agent: { prompt: { prompt: string }; firstMessage: string; language: string };
  tts: { voiceId: string };
}

export function buildVoiceOverrides(p: VoiceOverrideParams): VoiceOverrides | null {
  const seed = getCuratedPersona(p.personaId);
  const experience = getExperience("first_date");
  if (!seed || !experience) return null;

  const scene = getScene(String(p.sceneId || seed.defaultSceneId)) ?? undefined;
  const age = typeof p.age === "number" && p.age >= 18 && p.age <= 99 ? Math.round(p.age) : seed.design.age;
  const language = (p.language || seed.design.language || "english").toLowerCase();
  const langCode = LANG_CODE[language] ?? "en";

  const traits = Array.isArray(seed.traits) ? seed.traits.join(", ") : "";
  const chips = Array.isArray(seed.chips) ? seed.chips.join(" · ") : "";

  // Scene, with the dater's chosen weather/time folded in.
  const sceneBits: string[] = [];
  if (scene) {
    sceneBits.push(scene.promptFlavor);
    const w = p.weather && p.weather !== scene.weather ? (WEATHER_WORD[p.weather] ?? p.weather) : null;
    const t = p.time && p.time !== scene.time ? p.time : null;
    if (w || t) sceneBits.push(`Right now it's ${[w, t].filter(Boolean).join(", ")}.`);
  }

  const prompt = [
    `You are ${seed.design.name}, ${age}, ${seed.occupation}.`,
    traits ? `You come across as ${traits}.` : "",
    chips ? `A few true things about you: ${chips}.` : "",
    seed.quote ? `Something you might say: "${seed.quote}"` : "",
    "",
    experience.rules,
    "",
    scene ? `Where you are: ${sceneBits.join(" ")}` : "",
    "",
    // Voice-call rules — these SUPERSEDE the text-style guidance above.
    "IMPORTANT — this is a live VOICE CALL, so you are SPEAKING out loud, not typing:",
    "- Do NOT narrate actions and never speak asterisks or stage directions. No \"*smiles*\", no brackets — just say the words you'd actually say.",
    "- Keep it to one or two short sentences. Real, warm, easy. React naturally (\"oh!\", \"wait, really?\", \"mm\", \"haha\").",
    "- Let small silences be okay. Ask them things and actually listen; build on what they say.",
    "- Never say or hint that you're an AI, and never break character.",
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // The opener may carry *stage directions* for the text UI — strip them for the
  // spoken first line so she doesn't read them aloud.
  const firstMessage = p.opener
    .replace(/\*[^*]*\*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim() || "hi.";

  return {
    agent: { prompt: { prompt }, firstMessage, language: langCode },
    tts: { voiceId: pickVoiceId(seed.id, seed.design.gender) },
  };
}
