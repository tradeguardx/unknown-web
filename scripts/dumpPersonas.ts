// One-off: render the FULL system prompt for every persona type and dump to a
// txt file, exactly as the model receives it. Run:
//   PERSONA_WEIGHTS_JSON='{}' npx tsx scripts/dumpPersonas.ts
// Output: ../persona-prompts.txt

import { writeFileSync } from "fs";
import { join } from "path";
import {
  generatePersona,
  ARCHETYPE_HINTS,
  ROMANTIC_HINTS,
  type Archetype,
  type Persona,
} from "../lib/persona";
import { buildSystemPrompt } from "../lib/prompts";
import { directorSection } from "../lib/conversationDirector";
import type { UserPrefs } from "../lib/prefs";

const out: string[] = [];
const rule = (c = "=") => c.repeat(78);

function block(title: string, body: string) {
  out.push("\n\n" + rule() + "\n" + title + "\n" + rule() + "\n\n" + body);
}

out.push(
  "UNKNOWN.CHAT — FULL PERSONA PROMPTS (auto-generated)\n" +
    "Each block is a COMPLETE system prompt as the model receives it for one\n" +
    "persona type. Names/cities/ages/quirks are randomized per persona; the\n" +
    "ARCHETYPE section is the headline difference between types.\n",
);

// 1) One full prompt per archetype (intent=love so the romantic layer shows).
const archetypes = Object.keys(ARCHETYPE_HINTS) as Archetype[];
const lovePrefs: UserPrefs = { intent: "love", language: "english" } as UserPrefs;

for (const a of archetypes) {
  const p: Persona = generatePersona(lovePrefs);
  p.archetype = a; // force this archetype so its hint is injected
  const prompt = buildSystemPrompt(p, lovePrefs);
  block(
    `ARCHETYPE: ${a.toUpperCase().replace(/_/g, " ")}  ·  (example: ${p.name}, ${p.age}, ${p.country}, mood=${p.mood}, romance=${p.romanticType ?? "n/a"})`,
    prompt,
  );
}

// 2) Language example — same builder, non-English, to show the LANGUAGE block.
for (const language of ["hinglish", "punjabi", "spanish"]) {
  const prefs = { intent: "flirt", language } as unknown as UserPrefs;
  const p = generatePersona(prefs);
  block(`LANGUAGE VARIANT: ${language.toUpperCase()} (archetype ${p.archetype})`, buildSystemPrompt(p, prefs));
}

// 2b) L3 Conversation Director — runtime-injected block (NOT part of the static
// prompt above). Shown at each stage so the cadence is visible.
const sampleMem = {
  identity: ["28, architecture student"],
  interests: ["crochet", "travel", "old bookstores"],
  emotional: ["misses her niece", "gets shy when complimented", "stressed about finals"],
} as never;
const dirSamples = [
  `--- msg 2 (just met, no memory yet) ---\n${directorSection(2, undefined)}`,
  `--- msg 10 / ~turn 5 (warming up, with memory) ---\n${directorSection(10, sampleMem)}`,
  `--- msg 24 / ~turn 12 (clicking, with memory) ---\n${directorSection(24, sampleMem)}`,
  `--- msg 60 / ~turn 30 (connected, with memory) ---\n${directorSection(60, sampleMem)}`,
];
block(
  "LAYER 3 — CONVERSATION DIRECTOR (runtime-injected each turn, cache-safe)",
  "This short block is appended at request time (not baked into the static prompt\nabove). It nudges HOW to move the chat now — stage, threads to deepen, and a\nperiodic push to land a memorable beat.\n\n" +
    dirSamples.join("\n\n"),
);

// 3) Reference: every archetype hint + romantic hint verbatim (the building
// blocks that get injected above), so the diffs are easy to scan in one place.
block(
  "REFERENCE — ALL ARCHETYPE HINTS (verbatim)",
  archetypes.map((a) => `### ${a}\n${ARCHETYPE_HINTS[a]}`).join("\n\n"),
);
block(
  "REFERENCE — ALL ROMANTIC / FLIRT HINTS (verbatim)",
  Object.entries(ROMANTIC_HINTS)
    .map(([k, v]) => `### ${k}\n${v}`)
    .join("\n\n"),
);

const dest = join(__dirname, "..", "..", "persona-prompts.txt");
writeFileSync(dest, out.join("\n"), "utf8");
console.log(`Wrote ${dest} (${out.join("\n").length} chars, ${archetypes.length} archetypes)`);
