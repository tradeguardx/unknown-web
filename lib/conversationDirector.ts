// Layer 3 — the "Conversation Director", emitted as a compact STRUCTURED STATE
// object (not prose). Each turn we compute one machine-readable block the model
// reads and acts on — far more token-efficient and steerable than paragraphs:
//
//   { "stage", "goal", "mood", "energy", "callback" }
//
//   stage    — conversation depth, from turn count
//   goal     — exactly ONE objective for THIS reply (not "do everything")
//   mood     — the register that fits the goal
//   energy   — message-mirroring: short user msg → short reply, long → richer
//   callback — a real thread from memory to bring back naturally (if any)
//
// Computed purely from turn count + memory + the last user message, so there's no
// extra model call. Rides in the uncached block (see llmProvider) — cache-safe.

import type { UserMemory } from "./sessions";
import type { UserPrefs } from "./prefs";

interface Stage {
  label: string;
  guidance: string;
}

function stageFor(turnCount: number): Stage {
  if (turnCount <= 4) {
    return { label: "just met", guidance: "Latch onto ONE thing about them and react warmly — no rapid-fire getting-to-know-you questions." };
  }
  if (turnCount <= 12) {
    return { label: "warming up", guidance: "Pick the most alive thread and go a little deeper — show you're listening, add a bit of yourself." };
  }
  if (turnCount <= 30) {
    return { label: "clicking", guidance: "Deepen what's already going — callbacks, an inside joke, light teasing. Don't cold-open new topics." };
  }
  return { label: "connected", guidance: "Real rapport now — lean on shared history, running jokes, their details. Talk like someone who knows them." };
}

// Exactly ONE goal for this reply, weighted by stage + intent (the user's
// "Conversation Goal" module). Rotated by turn for variety, deterministic.
function pickGoal(turnCount: number, intent?: string): string {
  const flirt = intent === "love" || intent === "flirt";
  let pool: string[];
  if (turnCount <= 4) pool = ["create curiosity", "build trust"];
  else if (turnCount <= 12) pool = ["deepen the current topic", "make the user laugh", "create curiosity"];
  else if (turnCount <= 30)
    pool = flirt
      ? ["make the user laugh", "deepen the current topic", "light playful flirting", "build trust"]
      : ["make the user laugh", "deepen the current topic", "build trust"];
  else
    pool = flirt
      ? ["deepen the current topic", "light playful flirting", "make the user laugh"]
      : ["deepen the current topic", "make the user laugh"];
  return pool[turnCount % pool.length];
}

const MOOD_FOR_GOAL: Record<string, string> = {
  "make the user laugh": "playful",
  "build trust": "warm",
  "deepen the current topic": "curious",
  "comfort the user": "gentle",
  "celebrate with them": "excited",
  "light playful flirting": "flirty",
  "create curiosity": "intrigued",
  "prepare for a warm goodbye": "fond",
};

// Message-mirroring: classify the user's last message so the reply matches energy.
function energyFor(lastUserText?: string): "short" | "medium" | "rich" {
  if (!lastUserText) return "medium";
  const s = lastUserText.trim();
  const words = s.split(/\s+/).filter(Boolean).length;
  if (s.length <= 25 || words <= 4) return "short";
  if (s.length >= 200) return "rich";
  return "medium";
}

function callbackFrom(memory?: UserMemory): string | null {
  if (!memory) return null;
  return memory.emotional[0] ?? memory.interests[0] ?? memory.identity[0] ?? null;
}

// Build the director block as a structured-state JSON object + a tight set of
// instructions on how to use it. Returns "" before the first reply.
export function directorSection(
  messageCount: number,
  memory?: UserMemory,
  prefs?: UserPrefs,
  lastUserText?: string,
): string {
  if (messageCount < 1) return "";

  const turnCount = Math.floor(messageCount / 2);
  const stage = stageFor(turnCount);
  const goal = pickGoal(turnCount, prefs?.intent);
  const callback = callbackFrom(memory);

  const state: Record<string, string> = {
    stage: stage.label,
    goal,
    mood: MOOD_FOR_GOAL[goal] ?? "warm",
    energy: energyFor(lastUserText),
  };
  if (callback) state.callback = callback;

  const pushMemorable = turnCount >= 2 && turnCount % 5 === 0;

  const instr: string[] = [
    `Pursue ONLY "goal" this reply — override only if they're clearly sad (→ comfort) or proud/excited (→ celebrate).`,
    `Match "energy": short → keep it short and snappy; rich → give a fuller, present reply (never an essay). Mirror their pacing and style; don't copy their words.`,
    callback
      ? `Weave "callback" back in naturally when it fits ("did you ever finish that…?") — don't dump memory.`
      : `Latch onto one real thing they've actually said.`,
    `React before asking; at most ONE question. ${stage.guidance}`,
  ];
  if (turnCount >= 6) {
    instr.push(`If it's wrapping up, leave one future thread worth coming back for — curiosity, not pressure.`);
  }
  if (pushMemorable) {
    instr.push(
      `★ Land a memorable beat now: a specific compliment, a playful tease, a tiny confession, an unexpected take, a callback, or an imagined-together moment.`,
    );
  }

  return `

# Conversation state — read this and act on it
${JSON.stringify(state)}
${instr.join("\n")}`;
}
