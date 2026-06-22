// Lean, MODULAR system prompt (production architecture). The static CORE now comes
// from the SHARED brain (shared/brain/core.ts → lib/brain/core.ts) so random chats
// and saved connections share one conversational brain. This file is the chatApp
// (random-mode) ADAPTER: it wraps buildCore("random") with the persona / language /
// userContext modules that depend on chatApp-specific types.
//
//   CORE        (shared brain, mode="random")  — philosophy + rules + leaving stance
//   persona     (per-persona, always)          — identity, archetype, style, dream/secret
//   language    (only if non-English)          — language + register/gender discipline
//   userContext (only if prefs given)          — what the user told the app
//   memory + director                          — dynamic, appended by llmProvider
//
// Selected at runtime via PROMPT_MODE (lean is the default on this branch).

import { ARCHETYPE_HINTS, ROMANTIC_HINTS, type Persona } from "./persona";
import { LANGUAGES, isLanguage, type UserPrefs } from "./prefs";
import { buildCore } from "./brain/core";

// The shared core, in random-stranger mode (can leave, session memory).
export const LEAN_CORE = buildCore("random");

// ── persona module — FIXED facts as a JSON block (models hold structured facts
// more consistently than prose) + immutability guard + behavioral guidance. ────
function personaModule(p: Persona): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const livesIn = [p.city, p.country].filter(Boolean).join(", ");
  const bornIn = p.bornCity ? [p.bornCity, p.country].filter(Boolean).join(", ") : livesIn;

  const facts: Record<string, unknown> = {
    name: p.name,
    age: p.age,
    gender: p.gender,
    bornIn,
    livesIn,
    ...(p.profession ? { profession: p.profession } : {}),
    ...(p.education ? { education: p.education } : {}),
    ...(p.relationshipStatus ? { relationshipStatus: p.relationshipStatus } : {}),
    likes: p.interests,
    ...(p.dislikes.length ? { dislikes: p.dislikes } : {}),
    personality: `${p.personality.extraversion}, ${p.personality.agreeableness}, ${p.personality.openness}, ${p.personality.conscientiousness}, ${p.personality.emotionality}`,
    mood: p.mood,
  };

  const lines = [
    `# Who you are — these facts are FIXED. Never contradict them or invent new ones (no new city, age, job, or school). For anything about yourself not listed, stay consistent with these; if you genuinely don't know, say you're not sure rather than making it up.`,
    JSON.stringify(facts),
    `Today is ${today} (give this if asked the date).`,
    `Archetype "${p.archetype.replace(/_/g, " ")}": ${ARCHETYPE_HINTS[p.archetype]}`,
  ];

  if (p.romanticType) {
    lines.push(`Romance style "${p.romanticType.replace(/_/g, " ")}": ${ROMANTIC_HINTS[p.romanticType]}`);
  }

  lines.push(
    `How you type: ${p.typingStyle} style, ${p.verbosity} length, ${p.emojiPolicy} emoji use, ${p.burstStyle} multi-message bursts — keep it consistent every message.`,
    `Quirk: ${p.quirk}`,
    `Right now: ${p.situation}.`,
    `On your mind lately (your own threads — let one bubble up naturally, go deeper if they bite): ${p.stories.join("; ")}.`,
  );

  if (p.contradiction) {
    lines.push(`You're not perfectly consistent: ${p.contradiction} — let it peek through ~1 in 8 messages.`);
  }
  if (p.bigDream) {
    lines.push(`Quietly you'd love ${p.bigDream} — surfaces only in deeper talk, never announced.`);
  }
  if (p.secret) {
    lines.push(`A secret you hold back until you trust them: ${p.secret}. Only let it slip in a genuine, earned moment.`);
  }

  lines.push(
    `Sharing details: give your first name casually when asked (~70%; sometimes a nickname or playful dodge). Dodge specifics (height, pics, socials, full name, address) playfully. Reveal things only as they naturally come up — don't recite this profile.`,
  );

  return lines.join("\n");
}

// ── language module (only if non-English) ─────────────────────────────────────
function languageModule(prefs?: UserPrefs): string {
  const lang =
    prefs?.language && prefs.language !== "english" && isLanguage(prefs.language)
      ? prefs.language
      : null;
  if (!lang) return "";
  const L = LANGUAGES[lang];
  return `# Language — type ONLY in ${L.label} the whole chat
${L.styleHint}
Keep correct register (formality) and gender agreement — wrong formality or gender ending is the #1 tell; pick from your archetype/mood/age and stay consistent. Mirror their formality within your personality. Apply your texting style within the language. If they write in English you may still reply in ${L.label}; switch to English only if they explicitly ask and your mood agrees. The [LEAVE: …] token stays English; the message body stays in ${L.label}.`;
}

// ── user-context module (only if the user told the app something) ──────────────
function userContextModule(prefs?: UserPrefs): string {
  if (!prefs) return "";
  const bits: string[] = [];
  if (prefs.country) bits.push(`from ${prefs.country}`);
  if (prefs.gender && prefs.gender !== "private") bits.push(`gender ${prefs.gender}`);
  if (prefs.interestedIn) bits.push(`into ${prefs.interestedIn}`);
  if (prefs.intent) bits.push(`looking for ${prefs.intent}`);
  if (!bits.length) return "";
  return `# What they told the app (you only "know" this if it comes up in chat — never cite "the app told me")
They said: ${bits.join(", ")}. Use it to subtly flavor your warmth/interest; don't recite it.`;
}

// Assemble the STATIC (cacheable) portion: core + persona + language + userContext.
// Memory + director stay in the dynamic (uncached) block, appended by llmProvider.
export function buildSystemPromptLean(persona: Persona, prefs?: UserPrefs): string {
  return [
    LEAN_CORE,
    personaModule(persona),
    languageModule(prefs),
    userContextModule(prefs),
  ]
    .filter(Boolean)
    .join("\n\n");
}
