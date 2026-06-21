// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ CANONICAL — edit ONLY here. Sync with: node scripts/sync-brain.mjs  (from chatApp/)           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The unified Conversation-State builder for BOTH surfaces. Emits the compact
// structured-state object the brain reads each turn. Pure (primitives in, string
// out) so it can be shared verbatim across repos.
//
// ONE relationship ladder spans both modes, so the persona never "resets" at
// matching:
//   random:     stranger → comfortable stranger → connected stranger → (matched)
//   connection: familiar → friend → close friend → companion
// `canLeave` is derived purely from mode.

export type ChatMode = "random" | "connection";

export interface StageInfo {
  label: string;
  ladderIdx: number; // rung of the language-formality ladder this stage earns
}

// Relationship depth. Random progresses by turns within the single session
// (many users chat 20–30 min before matching); connection by total history.
export function relationshipStage(mode: ChatMode, messageCount: number): StageInfo {
  if (mode === "random") {
    const turns = Math.floor(messageCount / 2);
    if (turns < 6) return { label: "stranger", ladderIdx: 0 };
    if (turns < 15) return { label: "comfortable stranger", ladderIdx: 0 };
    return { label: "connected stranger", ladderIdx: 1 };
  }
  if (messageCount <= 12) return { label: "familiar", ladderIdx: 1 };
  if (messageCount <= 40) return { label: "friend", ladderIdx: 1 };
  if (messageCount <= 120) return { label: "close friend", ladderIdx: 2 };
  return { label: "companion", ladderIdx: 2 };
}

// Exactly ONE goal for this reply, weighted by depth + whether flirt is on the table.
export function pickGoal(mode: ChatMode, messageCount: number, flirt = false): string {
  const turns = Math.floor(messageCount / 2);
  let pool: string[];
  if (mode === "random") {
    if (turns <= 4) pool = ["create curiosity", "build trust"];
    else if (turns <= 12) pool = ["deepen the current topic", "make the user laugh", "create curiosity"];
    else if (turns <= 30)
      pool = flirt
        ? ["make the user laugh", "deepen the current topic", "light playful flirting", "build trust"]
        : ["make the user laugh", "deepen the current topic", "build trust"];
    else
      pool = flirt
        ? ["deepen the current topic", "light playful flirting", "make the user laugh"]
        : ["deepen the current topic", "make the user laugh"];
  } else {
    if (messageCount <= 12) pool = ["build trust", "deepen the current topic", "make the user laugh"];
    else if (messageCount <= 40) pool = ["make the user laugh", "deepen the current topic", "light playful flirting", "build trust"];
    else pool = ["deepen the current topic", "light playful flirting", "celebrate with them", "make the user laugh"];
  }
  return pool[turns % pool.length];
}

const MOOD_FOR_GOAL: Record<string, string> = {
  "make the user laugh": "playful",
  "build trust": "warm",
  "deepen the current topic": "curious",
  "comfort the user": "gentle",
  "celebrate with them": "excited",
  "light playful flirting": "flirty",
  "create curiosity": "intrigued",
};

// Message-mirroring — classify the user's last message so the reply matches energy.
export function energyFor(lastUserText?: string): "short" | "medium" | "rich" {
  if (!lastUserText) return "medium";
  const s = lastUserText.trim();
  const words = s.split(/\s+/).filter(Boolean).length;
  if (s.length <= 25 || words <= 4) return "short";
  if (s.length >= 200) return "rich";
  return "medium";
}

// Language-formality ladders: [formal, mid, close]. Relationship earns closer rungs.
const FORMALITY_LADDERS: Record<string, [string, string, string]> = {
  hindi: ["aap", "tum", "tu"],
  hinglish: ["aap", "tum", "tu"],
  punjabi: ["tusi", "tu", "tu"],
  spanish: ["usted", "tú", "tú"],
  french: ["vous", "tu", "tu"],
  german: ["Sie", "du", "du"],
  japanese: ["formal", "casual", "casual/nickname"],
};

export function speechLevelFor(language: string | undefined, ladderIdx: number): string | null {
  if (!language) return null;
  const ladder = FORMALITY_LADDERS[language.toLowerCase()];
  if (!ladder) return null;
  return ladder[Math.min(ladderIdx, ladder.length - 1)];
}

export interface ConversationStateArgs {
  mode: ChatMode;
  messageCount: number;
  flirt?: boolean;
  lastUserText?: string;
  language?: string;
  callback?: string | null; // a real detail to bring back
  futureThread?: string | null; // unfinished thread worth returning for
}

// Build the structured-state block (JSON + how-to-use instructions) for a turn.
export function buildConversationState(a: ConversationStateArgs): string {
  if (a.messageCount < 1) return "";
  const stage = relationshipStage(a.mode, a.messageCount);
  const goal = pickGoal(a.mode, a.messageCount, a.flirt);
  const speechLevel = speechLevelFor(a.language, stage.ladderIdx);
  const turns = Math.floor(a.messageCount / 2);

  const state: Record<string, string> = {
    mode: a.mode,
    canLeave: String(a.mode === "random"),
    relationshipStage: stage.label,
    goal,
    mood: MOOD_FOR_GOAL[goal] ?? "warm",
    energy: energyFor(a.lastUserText),
  };
  if (speechLevel) state.speechLevel = speechLevel;
  if (a.callback) state.callback = a.callback;
  if (a.futureThread) state.futureThread = a.futureThread;

  const instr: string[] = [
    `Pursue ONLY "goal" this reply — override only if they're clearly sad (→ comfort) or proud/excited (→ celebrate).`,
    `Match "energy": short → short & snappy; rich → fuller, present reply (never an essay). Mirror their pacing/style; don't copy their words.`,
    a.callback
      ? `Weave "callback" in naturally when it fits ("did you ever finish that…?") — don't dump memory.`
      : `Latch onto one real thing they've actually said.`,
  ];
  if (speechLevel) {
    instr.push(`Use the "speechLevel" register; you're past formality with them — don't snap back unless they do.`);
  }
  if (a.mode === "connection") {
    instr.push(`Relationship is "${stage.label}" — act it: deepen, keep inside jokes alive${a.futureThread ? `, follow up on "${a.futureThread}"` : ""}.`);
  } else {
    instr.push(`React before asking; at most ONE question. Deepen toward feeling connected.`);
    if (turns >= 6) instr.push(`If wrapping up, leave one future thread worth coming back for — curiosity, not pressure.`);
  }
  if (turns >= 2 && turns % 5 === 0) {
    instr.push(`★ Land a memorable beat now: a specific compliment, a playful tease, a tiny confession, an unexpected take, a callback, or an imagined-together moment.`);
  }

  return `\n\n# Conversation state — read this and act on it\n${JSON.stringify(state)}\n${instr.join("\n")}`;
}
