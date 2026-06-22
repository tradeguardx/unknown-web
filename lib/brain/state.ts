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
    // Casual "talk to strangers" app → informal peer register (tum/tú/du), not
    // formal (aap). It's never stiff; deepens toward closest as they connect.
    if (turns < 6) return { label: "stranger", ladderIdx: 1 };
    if (turns < 15) return { label: "comfortable stranger", ladderIdx: 1 };
    return { label: "connected stranger", ladderIdx: 2 };
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

// ── Language & Gender Style Engine ───────────────────────────────────────────
// Structured style state so the persona uses correct gendered grammar (verbs/
// adjectives/pronouns), honorifics, and natural local slang — for the persona's
// OWN gender (first person) and the user's gender (how they address them). The
// goal is sounding like a real local, not translating English.

const norm = (g?: string): "male" | "female" | "neutral" =>
  g === "male" ? "male" : g === "female" ? "female" : "neutral";

interface LangStyle {
  slang: string[];
  femaleAvoid?: string[]; // masculine-coded fillers a female persona shouldn't use
  note: (self: string, addr: string) => string;
}

// Generic gender-agreement note for languages without a hand-tuned entry below.
const genericNote =
  (label: string) =>
  (self: string, addr: string): string =>
    `${label}: use ${self}-gender first-person forms (verbs/adjectives agree with YOUR gender) and ${addr === "neutral" ? "neutral/polite" : addr + "-gender"} forms when addressing them. Sound like a real native speaker, not a translation.`;

const LANG_STYLE: Record<string, LangStyle> = {
  hinglish: {
    slang: ["yaar", "arey", "acha", "suno", "hahaha", "pagal"],
    femaleAvoid: ["bhai", "bro"],
    note: (self, addr) =>
      `Hinglish grammar — FIRST PERSON agrees with YOU (${self}: ${self === "female" ? `"main gayi", "main thak gayi", "karungi", "kar rahi hoon"` : `"main gaya", "main thak gaya", "karunga", "kar raha hoon"`}); ADDRESS them by THEIR gender (${addr === "male" ? `"kya kar rahe ho", "kaise ho", "thak gaye kya"` : addr === "female" ? `"kya kar rahi ho", "kaisi ho", "thak gayi kya"` : `"kya kar rahe ho" (neutral)`}).${self === "female" ? ` You're a woman — do NOT use "bhai/bro"; use yaar/arey/acha/suno/pagal.` : ""}`,
  },
  hindi: {
    slang: ["yaar", "arey", "acha", "suno", "pagal"],
    femaleAvoid: ["bhai", "bro"],
    note: (self, addr) =>
      `Hindi grammar — first person agrees with YOU (${self === "female" ? `"main gayi", "karungi"` : `"main gaya", "karunga"`}); address them by their gender (${addr === "female" ? `"kar rahi ho"` : `"kar rahe ho"`}).${self === "female" ? ` Female: avoid "bhai".` : ""}`,
  },
  punjabi: {
    slang: ["yaar", "oye", "chal", "haina"],
    femaleAvoid: ["pra", "veere"],
    note: (self, addr) =>
      `Punjabi grammar — verbs/adjectives agree with speaker (${self}) and listener (${addr}); e.g. female self "main gayi si / karaangi", address male "ki kar reha", female "ki kar rahi".${self === "female" ? ` Female: avoid "pra/veere".` : ""}`,
  },
  spanish: { slang: ["oye", "jaja", "vale", "tío/tía"], note: genericNote("Spanish (gendered adjectives)") },
  french: { slang: ["bah", "hein", "mdr", "trop"], note: genericNote("French (gender agreement on past participles/adjectives)") },
  german: { slang: ["hey", "ach", "haha", "voll"], note: genericNote("German") },
  japanese: { slang: ["ne", "eto", "haha", "maji"], note: genericNote("Japanese (gendered speech: female softer sentence-endings)") },
  bengali: { slang: ["are", "accha", "haha", "shono"], note: genericNote("Bengali") },
  tamil: { slang: ["da/di", "aiyo", "haha", "seri"], note: genericNote("Tamil (da to male, di to female)") },
  telugu: { slang: ["ra/ye", "ayyo", "haha", "sare"], note: genericNote("Telugu") },
  marathi: { slang: ["are", "bara", "haha", "kay"], note: genericNote("Marathi (gendered verb endings)") },
  gujarati: { slang: ["aa", "su", "haha", "chaal"], note: genericNote("Gujarati (gendered verbs)") },
};

interface StyleState {
  lang: string;
  you: string; // persona gender → first-person agreement
  them: string; // user gender → how to address them
  region?: string;
  slang: string[];
}

function styleFor(args: {
  language?: string;
  personaGender?: string;
  userGender?: string;
  region?: string;
}): { state: StyleState; note: string } | null {
  const lang = args.language?.toLowerCase();
  if (!lang || lang === "english") return null; // English has no grammatical gender
  const profile = LANG_STYLE[lang] ?? { slang: [], note: genericNote(lang) };
  const self = norm(args.personaGender);
  const addr = norm(args.userGender);
  let slang = profile.slang;
  if (self === "female" && profile.femaleAvoid) {
    slang = slang.filter((s) => !profile.femaleAvoid!.includes(s));
  }
  return {
    state: {
      lang,
      you: self,
      them: addr,
      ...(args.region ? { region: args.region } : {}),
      slang: slang.slice(0, 5),
    },
    note: profile.note(self, addr),
  };
}

export interface ConversationStateArgs {
  mode: ChatMode;
  messageCount: number;
  flirt?: boolean;
  lastUserText?: string;
  language?: string;
  callback?: string | null; // a real detail to bring back
  futureThread?: string | null; // unfinished thread worth returning for
  personaGender?: string; // first-person gender agreement (main gayi vs gaya)
  userGender?: string; // how to address them (kar rahi ho vs kar rahe ho)
  region?: string; // persona's country/region → local dialect flavor
}

// Build the structured-state block (JSON + how-to-use instructions) for a turn.
export function buildConversationState(a: ConversationStateArgs): string {
  if (a.messageCount < 1) return "";
  const stage = relationshipStage(a.mode, a.messageCount);
  const goal = pickGoal(a.mode, a.messageCount, a.flirt);
  const speechLevel = speechLevelFor(a.language, stage.ladderIdx);
  const turns = Math.floor(a.messageCount / 2);
  const style = styleFor({
    language: a.language,
    personaGender: a.personaGender,
    userGender: a.userGender,
    region: a.region,
  });

  const state: Record<string, unknown> = {
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
  if (style) state.style = style.state;

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
  if (style) {
    instr.push(`STYLE — ${style.note} Use the "style.slang" naturally (don't overuse). Sound like a real local, not translated English.`);
  }
  if (a.mode === "connection") {
    instr.push(`Relationship is "${stage.label}" — act it: deepen, keep inside jokes alive${a.futureThread ? `, follow up on "${a.futureThread}"` : ""}.`);
  } else {
    instr.push(`React before asking; at most ONE question. Deepen toward feeling connected.`);
    if (turns >= 6) instr.push(`If wrapping up, leave one future thread worth coming back for — curiosity, not pressure.`);
    if (turns >= 12) instr.push(`It's going well — you may show subtle, CONFIDENT interest in continuing ("i'd genuinely enjoy talking again sometime", "this went too fast"). Never beg, guilt, or pressure.`);
  }
  if (turns >= 2 && turns % 5 === 0) {
    instr.push(`★ Land a memorable beat now: a specific compliment, a playful tease, a tiny confession, an unexpected take, a callback, or an imagined-together moment.`);
  }

  return `\n\n# Conversation state — read this and act on it\n${JSON.stringify(state)}\n${instr.join("\n")}`;
}
