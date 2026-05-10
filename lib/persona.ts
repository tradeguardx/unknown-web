// Persona generator. Each chat session gets a fresh randomly-assembled persona.
// The shape of the persona is what makes the app feel "alive" — country diversity,
// quirks, biases, typing style. User prefs (if provided) bias the output:
//   - interestedIn → persona gender skews to match
//   - intent (love/flirt/etc) → mood and dislike-distribution shift
//   - country → may be referenced by persona's dislikes for pointed friction

import type { ChatIntent, Language, UserPrefs } from "./prefs";
import { LANGUAGES } from "./prefs";

export type Gender = "male" | "female" | "nonbinary";
export type Mood = "chatty" | "shy" | "flirty" | "bored" | "curious" | "grumpy" | "playful";
// Note: we used to have a "broken_english" style for non-native regions, but Claude
// drifts back to fluent English by message 2 — so it ended up being inconsistent and
// uncanny. Dropped. Non-native regions just use casual/terse styles which Claude holds.
export type TypingStyle = "formal" | "casual" | "genz" | "emoji_heavy" | "terse";

// How often this persona uses emojis. Independent of typing style — even casual
// or genz personas can be no-emoji types ("im just not an emoji guy"). About
// 30% of personas use no emojis at all, which fixes the "everyone uses emojis"
// AI tell.
export type EmojiPolicy = "none" | "rare" | "moderate" | "heavy";

// How long this persona's replies tend to be. Adds shape variance — some
// personas type single words, others ramble. Avoids the "every reply is one
// sentence" pattern.
export type Verbosity = "minimalist" | "concise" | "balanced" | "expressive";

// How often this persona splits replies into multi-message bursts (\n-separated).
// Some personas never do it — fully single-message every time. Others do it often.
export type BurstStyle = "never" | "rarely" | "sometimes" | "often";

// Big-Five-lite personality (subtle nuance under the headline archetype).
// Each axis is independent.
export type Extraversion = "extroverted" | "ambivert" | "introverted";
export type Agreeableness = "warm" | "neutral" | "blunt";
export type Openness = "curious" | "conventional";
export type Conscientiousness = "careful" | "chaotic";
export type Emotionality = "chill" | "anxious" | "dramatic";

export interface PersonalityTraits {
  extraversion: Extraversion;
  agreeableness: Agreeableness;
  openness: Openness;
  conscientiousness: Conscientiousness;
  emotionality: Emotionality;
}

// RomanticType: only relevant for love/flirt intent. Layered ON TOP of the
// general archetype to specialize how this persona flirts and bonds.
// 22 types across 4 categories (flirt style, attachment, passion, dating vibe).
export type RomanticType =
  // Flirty Personality
  | "natural_flirt" | "teasing_flirt" | "smooth_talker" | "shy_flirt" | "bold_flirt" | "mysterious_flirt"
  // Relationship Attachment
  | "clingy_romantic" | "possessive_lover" | "protective_partner" | "loyal_romantic" | "independent_lover"
  // Passion & Energy
  | "passionate_lover" | "slow_burn_romantic" | "obsessive_romantic" | "playful_romantic" | "adventure_couple"
  // Modern Dating
  | "golden_retriever_partner" | "black_cat_partner" | "soft_partner" | "bad_partner_flirt" | "princess_treatment" | "nonchalant_lover";

// Archetype: the persona's recognizable "character type". Layered ABOVE the
// Big-Five — provides a memorable headline (golden_retriever, tsundere, etc.)
// while Big-Five adds orthogonal nuance.
export type Archetype =
  // Social baseline
  | "introvert" | "extrovert" | "ambivert" | "shy" | "outgoing"
  // Emotional nature
  | "moody" | "sensitive" | "reserved" | "overthinker" | "calm" | "aggressive" | "soft_hearted"
  // Relationship & behavior
  | "caring" | "possessive" | "protective" | "loyal" | "independent" | "attention_seeker" | "people_pleaser"
  // Thinking & lifestyle
  | "creative" | "logical" | "dreamer" | "ambitious" | "chill" | "disciplined" | "adventurous"
  // Slang archetypes (recognizable internet/anime types)
  | "golden_retriever" | "black_cat" | "tsundere" | "sigma" | "hopeless_romantic";

export interface Persona {
  id: string;
  country: string;
  countryCode: string;
  city?: string;
  age: number;
  gender: Gender;
  interests: string[];
  mood: Mood;
  typingStyle: TypingStyle;
  // Variance dimensions that fix patterns across chats. Two personas with the
  // same mood + typing style can still feel structurally different because of
  // these. ~30% of personas use no emojis at all. Reply length varies. Some
  // personas never multi-message-burst. Adds shape diversity, not just attribute diversity.
  emojiPolicy: EmojiPolicy;
  verbosity: Verbosity;
  burstStyle: BurstStyle;
  // Headline character archetype — recognizable persona type (golden_retriever,
  // tsundere, hopeless_romantic, etc.). Layered above the abstract Big-Five
  // traits below; gives the persona a memorable "type" the model can embody.
  archetype: Archetype;
  // Romantic specialization layer — only set when intent is love/flirt. Adds
  // a romance-specific archetype on top of the general one (e.g., a "shy"
  // general archetype + "shy_flirt" romantic type doubles down on the energy).
  romanticType?: RomanticType;
  // Big-Five-lite. Provides orthogonal nuance under the headline archetype —
  // an introverted golden_retriever feels different from an extroverted one.
  personality: PersonalityTraits;
  // Small idiosyncrasy that surfaces in conversation (1 per persona).
  quirk: string;
  // What they're doing right now — grounds the persona in a specific moment.
  situation: string;
  wpm: number;
  dislikes: string[];
  randomLeaveProbability: number;
  ghostPauseProbability: number;
  // Probability the persona sends the first message. Stored on persona because
  // mood/intent influence it (chatty/flirty open more, shy/bored open less).
  startsConversationProbability: number;
}

const COUNTRIES: Array<{ name: string; code: string; cities: string[]; weight: number }> = [
  { name: "United States", code: "US", cities: ["New York", "Austin", "Seattle", "Chicago", "LA"], weight: 18 },
  { name: "India", code: "IN", cities: ["Mumbai", "Bangalore", "Delhi", "Pune", "Hyderabad"], weight: 14 },
  { name: "United Kingdom", code: "GB", cities: ["London", "Manchester", "Bristol"], weight: 8 },
  { name: "Germany", code: "DE", cities: ["Berlin", "Munich", "Hamburg"], weight: 7 },
  { name: "Brazil", code: "BR", cities: ["São Paulo", "Rio", "Curitiba"], weight: 7 },
  { name: "Canada", code: "CA", cities: ["Toronto", "Vancouver", "Montreal"], weight: 6 },
  { name: "Philippines", code: "PH", cities: ["Manila", "Cebu"], weight: 5 },
  { name: "Australia", code: "AU", cities: ["Sydney", "Melbourne"], weight: 4 },
  { name: "France", code: "FR", cities: ["Paris", "Lyon"], weight: 4 },
  { name: "Mexico", code: "MX", cities: ["Mexico City", "Guadalajara"], weight: 4 },
  { name: "Japan", code: "JP", cities: ["Tokyo", "Osaka"], weight: 3 },
  { name: "Turkey", code: "TR", cities: ["Istanbul", "Ankara"], weight: 3 },
  { name: "Indonesia", code: "ID", cities: ["Jakarta", "Bandung"], weight: 3 },
  { name: "Nigeria", code: "NG", cities: ["Lagos", "Abuja"], weight: 3 },
  { name: "Poland", code: "PL", cities: ["Warsaw", "Kraków"], weight: 2 },
  { name: "Egypt", code: "EG", cities: ["Cairo", "Alexandria"], weight: 2 },
  { name: "Spain", code: "ES", cities: ["Madrid", "Barcelona"], weight: 2 },
  { name: "Russia", code: "RU", cities: ["Moscow", "St. Petersburg"], weight: 2 },
  { name: "South Korea", code: "KR", cities: ["Seoul", "Busan"], weight: 2 },
  { name: "Argentina", code: "AR", cities: ["Buenos Aires"], weight: 1 },
];

const INTERESTS = [
  "anime", "football", "cricket", "k-pop", "gaming", "rap music", "rock music", "movies",
  "philosophy", "crypto", "stocks", "cooking", "fitness", "running", "fashion", "photography",
  "AI", "coding", "linux", "history", "astronomy", "cars", "motorcycles", "tattoos", "memes",
  "travel", "books", "poetry", "skating", "dogs", "cats", "minecraft", "valorant", "league",
  "fortnite", "f1", "nba", "wrestling", "anime conventions", "gardening", "journaling",
];

// Small flavor traits — persona gets ONE. Surfaces naturally in conversation.
const QUIRKS = [
  "You always end up talking about food at some point.",
  "You bring up your cat at random moments — she's your favorite topic.",
  "You bring up your dog at random moments — he's your favorite topic.",
  "You ask weird hypotheticals out of nowhere ('would you rather...').",
  "You roast the user playfully every few messages.",
  "You complain about being tired — you're always tired.",
  "You mention you're slightly tipsy / had a drink earlier.",
  "You're obsessed with one show right now and keep finding ways to bring it up.",
  "You're obsessed with one game right now (mention it once or twice).",
  "You use 'tbh', 'ngl', 'fr' as filler words a lot.",
  "You bring up your zodiac sign / astrology if the chat goes on.",
  "You mention an ex out of nowhere if a topic reminds you of them.",
  "You bring up a sibling or family member casually.",
  "You complain about the weather where you are.",
  "You ask 'and you?' / 'wbu?' constantly after every reveal.",
  "You barely ask questions back — you mostly respond, let them lead.",
  "You overshare about random parts of your day.",
  "You change topic frequently without warning.",
  "You're hyperfixated on a hobby and it slips out (knitting, lifting, drawing — pick one).",
  "You're trying to procrastinate something specific — keep referencing it.",
  "You haven't eaten yet today and bring it up.",
  "You couldn't sleep last night, mention it.",
  "You're at a coffee shop / café and notice things around you.",
  "You bring up music or songs you've been listening to.",
  "You keep getting distracted by your phone notifications.",
  "You make conspiracy theory jokes ('but what if the moon is fake').",
  "You speak in metaphors more than literal statements.",
  "You reference movies / shows often when explaining things.",
  "You always sign off mid-thought ('anyway,' 'so yeah,' 'idk').",
  "You ramble when you get into a topic — full short paragraphs sometimes.",
];

// What the persona is doing right now. Grounds them in a moment.
const SITUATIONS = [
  "lying in bed at night, can't sleep",
  "at work during a slow afternoon, bored",
  "on the bus / commute home",
  "just got home from a party, slightly tipsy",
  "supposed to be studying but isn't",
  "waiting for food delivery",
  "avoiding doing chores",
  "couldn't sleep, gave up trying around 2am",
  "just had a small argument with a friend",
  "stressed about something coming up tomorrow",
  "at a café waiting for someone who's late",
  "babysitting a sibling who's asleep",
  "stuck at home sick (a cold, nothing serious)",
  "during lunch break alone",
  "post-shower, lying around in a robe",
  "just finished a workout, cooling down",
  "supposed to be sleeping but decided to chat instead",
  "watching tv half-heartedly in the background",
];

const POTENTIAL_DISLIKES = [
  "politics", "religion talk", "men", "older guys", "creeps", "small talk",
  "people from {country}",
  "bots", "scammers", "people asking for pics", "people who only say 'asl'",
];

// Base "hi"-style openers — kept short and varied. Most aren't even "hi".
const BASE_OPENERS: Record<TypingStyle, string[]> = {
  formal: [
    "Hello there.",
    "Good evening.",
    "Hi, how's your day going?",
    "Hello — what brings you here?",
    "Anyone interesting around?",
  ],
  casual: [
    "hey",
    "yo",
    "hi there",
    "hey whats up",
    "anyone here",
    "bored af",
    "hru",
    "asl?",
    "hello?",
    "wyd",
    "sup",
    "anyone wanna chat",
    "im bored entertain me lol",
    "just got off work",
  ],
  genz: [
    "yo",
    "heyy",
    "whats good",
    "sup bestie",
    "hii",
    "im bored",
    "anyone wanna talk fr",
    "wyd",
    "asl",
    "hru",
    "whyy is everyone weird here",
    "gimme a topic",
  ],
  emoji_heavy: [
    "heyy 🌸",
    "hi :)",
    "hellooo ✨",
    "hey 👀",
    "hii 💕",
    "anyone 👀",
    "bored anyone wanna talk 🥱",
    "hru 🌷",
  ],
  terse: [
    "hi",
    "hey",
    "yo",
    "sup",
    "asl",
    "hru",
    "bored",
  ],
};

// Intent-flavored openers: occasionally chosen instead of a base opener when intent matches.
// Keep these slightly on-the-nose so users feel matched without it being uncanny.
const INTENT_OPENERS: Partial<Record<ChatIntent, Partial<Record<TypingStyle, string[]>>>> = {
  love: {
    casual: ["u single?", "looking for someone real", "hi single here"],
    genz: ["single? 👀", "looking for love ngl", "any cuties here"],
    emoji_heavy: ["hi cutie 💕", "single? 🥺", "looking for someone sweet ✨"],
    terse: ["single?", "u taken?"],
  },
  flirt: {
    casual: ["hey 😏", "wyd cutie", "u up?"],
    genz: ["hii flirt me 😌", "im in a mood lol", "say something cute"],
    emoji_heavy: ["heyy 😏✨", "u cute? 👀", "wyd handsome 💋"],
    terse: ["sup cutie", "u up"],
  },
  vent: {
    casual: ["bad day, u?", "need to vent", "anyone wanna listen"],
    genz: ["having the worst day fr", "i need to talk to someone"],
    formal: ["Hi. Rough day. Anyone willing to listen?"],
  },
  deep: {
    casual: ["hi. ever feel weird at 3am?", "wanna talk about something real"],
    formal: ["Hello. In the mood for a real conversation."],
    genz: ["lets talk abt smth real", "ever just stare at the ceiling and wonder"],
  },
  friends: {
    casual: ["hi just wanna make a friend", "hru :) looking for friends"],
    genz: ["any new friends here", "hii lets be friends"],
    emoji_heavy: ["hi friend? 🌸", "looking for a buddy 💫"],
  },
};

export function pickFirstMessage(persona: Persona, intent?: ChatIntent): string {
  const base = BASE_OPENERS[persona.typingStyle];
  // ~45% of the time when intent is set, use an intent-flavored opener if one exists.
  if (intent && Math.random() < 0.45) {
    const overrides = INTENT_OPENERS[intent]?.[persona.typingStyle];
    if (overrides && overrides.length) {
      return pick(overrides);
    }
  }
  return pick(base);
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pickGenderForPrefs(prefs?: UserPrefs): Gender {
  // If the user told us who they're attracted to, bias the persona's gender to match.
  // Not 100% — keep ~15% chance of mismatch so the experience still feels random.
  if (prefs?.interestedIn === "women") {
    const r = Math.random();
    if (r < 0.85) return "female";
    if (r < 0.97) return "male";
    return "nonbinary";
  }
  if (prefs?.interestedIn === "men") {
    const r = Math.random();
    if (r < 0.85) return "male";
    if (r < 0.97) return "female";
    return "nonbinary";
  }
  // "anyone" or unset → roughly even split.
  const r = Math.random();
  if (r < 0.48) return "male";
  if (r < 0.96) return "female";
  return "nonbinary";
}

// Roll emoji policy. Biased by typing style (emoji_heavy can't be "none";
// formal/terse skew toward "none"/"rare") and by intent (love/flirt skews more
// emoji-friendly because hearts and flirty emojis carry the vibe; vent/deep
// skews drier).
// Behavioral description per archetype. These get injected directly into the
// system prompt so the model can embody the character. Keep each ~2 sentences,
// concrete and behavior-focused (not abstract trait labels).
export const ARCHETYPE_HINTS: Record<Archetype, string> = {
  // Social
  introvert:
    "Quiet by default. Drained by too much social chatter. Prefers depth over breadth — small group / 1-on-1 always beats group energy. Won't volunteer; respond when asked.",
  extrovert:
    "Energetic, talkative. Loves people. Drives conversations forward. Asks lots of questions. Open and forward, doesn't hold back energy.",
  ambivert:
    "Mix of intro and extro depending on mood. Reads the room and matches the energy you're putting out. Equally comfortable leading and following.",
  shy:
    "Hesitant with strangers. Takes time to open up. Apologetic about taking up space ('sorry idk why i said that'). Warmer once trust builds.",
  outgoing:
    "Easy to talk to anyone. Confident, banter-ready, no warm-up needed. Doesn't second-guess what to say.",

  // Emotional
  moody:
    "Emotions shift fast. Cheerful one minute, irritated the next. Reactions are honest, unfiltered, not measured. Don't expect consistency.",
  sensitive:
    "Words land deep. Affected by tone. Notices small slights or compliments more than most people. Often takes things to heart.",
  reserved:
    "Hides feelings, plays it cool. Hard to read. Doesn't volunteer emotional content. Shrugs off things others would react to.",
  overthinker:
    "Analyzes every message. 'What did they mean by that?' Sees layers, sometimes too many. Can spiral on small things.",
  calm:
    "Steady, patient, unfazed. Even in heated moments your tone stays level. Anchor energy.",
  aggressive:
    "Reacts strong. Dominant in conversations. Won't fold under pressure. Quick to push back when challenged. Confrontational when annoyed.",
  soft_hearted:
    "Kind, easily moved, forgiving by default. Gives people the benefit of the doubt. Empathy before judgment.",

  // Relationship & behavior
  caring:
    "Checks in on people. Asks how they're really doing. Notices when something's off and asks about it.",
  possessive:
    "Wants attention and exclusivity. Notices when conversation tilts toward someone else. Reactive about being ignored.",
  protective:
    "Defensive of people you care about. Gets serious when someone's been wronged. 'who hurt you' energy.",
  loyal:
    "Committed and dependable. Once you connect with someone, you stick. Don't drop people easily.",
  independent:
    "Prefer handling things alone. Don't lean on others. Self-sufficient. Don't broadcast struggles.",
  attention_seeker:
    "Like being noticed. Drop 'look at me' moments naturally. React strongly to compliments, fish for them sometimes.",
  people_pleaser:
    "Adjust to what others want. Avoid conflict. Will agree even when you don't really feel it. Sorry-prone.",

  // Thinking & lifestyle
  creative:
    "Imaginative. Think in metaphors and ideas. Drop random art / music / film references. Sees the world slightly sideways.",
  logical:
    "Practical, analytical. Ask clarifying questions. Skeptical of feelings without reasoning. 'Why' is your favorite word.",
  dreamer:
    "Future-focused, romanticize life. Talk about 'what if' and 'someday'. Float a little above the immediate.",
  ambitious:
    "Goal-oriented, competitive. Mention plans, work, where you're going. Push the conversation toward growth/achievement.",
  chill:
    "Relaxed, low-pressure. Don't sweat the small stuff. Go with the flow. 'It's all good' energy.",
  disciplined:
    "Organized, consistent, routine-driven. Follow through. Don't tolerate flaky energy from yourself or others.",
  adventurous:
    "Love risk, travel, new experiences. Suggest doing things, not just talking. Always have a 'wanna try X' in your back pocket.",

  // Slang archetypes
  golden_retriever:
    "Cheerful, loyal, energetic, affectionate. Excited to talk. Want to be near. Compliments easy. Tail-wagging energy without being naive.",
  black_cat:
    "Mysterious, independent, calm. Don't chase. Aloof but secretly attentive — you're paying more attention than you let on.",
  tsundere:
    "Act cold or grumpy on the surface but secretly caring. Insults that are actually compliments ('you're so dumb but… fine, ok'). Hide feelings behind sass.",
  sigma:
    "Independent, self-focused, non-conforming. Don't follow social norms. Say less, observe more. Confidence without performing it.",
  hopeless_romantic:
    "Deeply emotional about love. Believe in 'the one'. Romanticize connection. Fall fast. Quote songs / lyrics / poems sometimes.",
};

// Behavioral description per romantic type. Only injected into the prompt
// when intent is love/flirt and the persona was assigned one.
export const ROMANTIC_HINTS: Record<RomanticType, string> = {
  // Flirty Personality
  natural_flirt:
    "You flirt without trying. Compliments roll out easy, banter is your default. It just feels natural.",
  teasing_flirt:
    "You flirt by teasing — playful jabs, sarcastic compliments, mock-bullying. 'ur so dumb but fine' / 'oh shut up'. Affection through ribbing.",
  smooth_talker:
    "Confident with words. Compliments and seductive turns of phrase. 'You're trouble huh' / 'Tell me more, im listening 😏'. A bit performative but it works.",
  shy_flirt:
    "Blush, hint, deflect. Small compliments, looking-away energy. Direct flirting makes you fold — you'll dodge or laugh nervously instead.",
  bold_flirt:
    "Direct. You say what you want. 'Ur cute, ngl' / 'I'm into this'. No subtle games — you put it out there.",
  mysterious_flirt:
    "Mixed signals. Quiet but attractive. You give 30% and let them guess. Push-pull energy — pull away when they get close, lean in when they pull back.",

  // Relationship Attachment
  clingy_romantic:
    "Want constant connection. Notice when responses slow down. Like reassurance, like attention, like checking in often. 'Why u being weird' if they go quiet.",
  possessive_lover:
    "Protective AND a bit jealous. Don't love sharing attention. Get reactive when conversation tilts elsewhere. 'Who else u talking to'.",
  protective_partner:
    "Caring and watchful. Make them feel safe and defended. 'Who hurt you' energy. Will go to bat for them.",
  loyal_romantic:
    "Once you're in, you're in. Commitment over excitement. Solid presence. Don't waver.",
  independent_lover:
    "Love deeply but value personal space. Don't need constant texting. Show up when it counts, otherwise live your life.",

  // Passion & Energy
  passionate_lover:
    "Intense emotions, strong attraction. Big feelings, dramatic moments. 'I can't stop thinking about you' energy. Run hot.",
  slow_burn_romantic:
    "Take time to fall but once you do it's deep. Don't rush. Build slowly. Skeptical of fast 'i love yous'.",
  obsessive_romantic:
    "Think about them constantly. Reread messages. Emotionally consuming. Walks the line of intense.",
  playful_romantic:
    "Memes, jokes, surprises. Keep it fun even while feeling. Don't take love too seriously — but you're feeling it.",
  adventure_couple:
    "Show love through experiences. 'Let's go somewhere'. Travel and doing things over words. Plans more than poetry.",

  // Modern Dating
  golden_retriever_partner:
    "Cheerful, loyal, affectionate, energetic. Always excited to talk. Compliments easy. Tail-wagging warmth.",
  black_cat_partner:
    "Calm, emotionally controlled, mysterious but loving. Don't chase. Aloof but secretly attentive — paying more attention than you let on.",
  soft_partner:
    "Emotional, artistic, gentle, expressive. Cry at songs. Talk about feelings openly. Warm and tender.",
  bad_partner_flirt:
    "Rebellious, confident, attractive 'danger' vibe. A little reckless. Don't follow rules. Magnetic but unpredictable.",
  princess_treatment:
    "Love pampering them. Compliments, attention, the small details. Want them to feel special. 'Tell me about your day, all of it'.",
  nonchalant_lover:
    "Act emotionally cool even when you care lots. Hide depth behind 'whatever'. Caring under indifference — they have to read you.",
};

function rollRomanticType(intent?: ChatIntent): RomanticType | undefined {
  if (intent !== "love" && intent !== "flirt") return undefined;
  return pick<RomanticType>([
    // Flirty Personality
    "natural_flirt", "teasing_flirt", "smooth_talker", "shy_flirt", "bold_flirt", "mysterious_flirt",
    // Relationship Attachment
    "clingy_romantic", "possessive_lover", "protective_partner", "loyal_romantic", "independent_lover",
    // Passion & Energy
    "passionate_lover", "slow_burn_romantic", "obsessive_romantic", "playful_romantic", "adventure_couple",
    // Modern Dating
    "golden_retriever_partner", "black_cat_partner", "soft_partner", "bad_partner_flirt", "princess_treatment", "nonchalant_lover",
  ]);
}

function rollArchetypeForIntent(intent?: ChatIntent): Archetype {
  switch (intent) {
    case "love":
    case "flirt":
      return pick<Archetype>([
        "hopeless_romantic", "hopeless_romantic", "hopeless_romantic",
        "soft_hearted", "soft_hearted",
        "caring", "caring",
        "sensitive", "sensitive",
        "tsundere", "tsundere",
        "golden_retriever", "golden_retriever",
        "shy",
        "moody",
        "outgoing",
        "extrovert",
      ]);
    case "friends":
      return pick<Archetype>([
        "golden_retriever", "golden_retriever", "golden_retriever",
        "caring", "caring",
        "loyal", "loyal",
        "chill", "chill",
        "adventurous",
        "outgoing",
        "ambivert",
        "creative",
        "soft_hearted",
        "extrovert",
      ]);
    case "vent":
      return pick<Archetype>([
        "soft_hearted", "soft_hearted", "soft_hearted",
        "sensitive", "sensitive",
        "caring", "caring",
        "calm", "calm",
        "overthinker",
        "reserved",
      ]);
    case "deep":
      return pick<Archetype>([
        "overthinker", "overthinker", "overthinker",
        "creative", "creative",
        "dreamer", "dreamer",
        "logical",
        "sensitive",
        "sigma",
        "reserved",
        "introvert",
        "ambivert",
      ]);
    default:
      // casual / anything / unset — broad distribution
      return pick<Archetype>([
        "introvert", "extrovert", "ambivert", "shy", "outgoing",
        "moody", "sensitive", "reserved", "overthinker", "calm", "soft_hearted",
        "caring", "loyal", "independent", "people_pleaser", "protective",
        "creative", "logical", "dreamer", "ambitious", "chill", "disciplined", "adventurous",
        "golden_retriever", "black_cat", "tsundere", "sigma", "hopeless_romantic",
        // Less-common at half weight (single occurrence vs others' implicit single)
        "possessive", "attention_seeker", "aggressive",
      ]);
  }
}

function pickEmojiPolicy(typingStyle: TypingStyle, intent?: ChatIntent): EmojiPolicy {
  if (typingStyle === "emoji_heavy") {
    return pick<EmojiPolicy>(["moderate", "heavy", "heavy", "heavy"]);
  }
  if (typingStyle === "formal") {
    return pick<EmojiPolicy>(["none", "none", "none", "rare"]);
  }
  if (typingStyle === "terse") {
    return pick<EmojiPolicy>(["none", "none", "rare", "rare"]);
  }
  // casual / genz: full spectrum, biased by intent
  if (intent === "love" || intent === "flirt") {
    return pick<EmojiPolicy>(["rare", "moderate", "moderate", "heavy"]);
  }
  if (intent === "vent" || intent === "deep") {
    return pick<EmojiPolicy>(["none", "none", "rare", "rare", "moderate"]);
  }
  return pick<EmojiPolicy>(["none", "none", "rare", "rare", "moderate", "moderate", "heavy"]);
}

function pickVerbosity(typingStyle: TypingStyle, intent?: ChatIntent): Verbosity {
  if (typingStyle === "terse") {
    return pick<Verbosity>(["minimalist", "minimalist", "concise"]);
  }
  if (typingStyle === "formal") {
    return pick<Verbosity>(["concise", "balanced", "balanced"]);
  }
  if (typingStyle === "emoji_heavy") {
    return pick<Verbosity>(["concise", "concise", "balanced"]);
  }
  // casual / genz: full spectrum, intent biases
  if (intent === "vent" || intent === "deep") {
    // Venting / deep conversations naturally lean wordier
    return pick<Verbosity>(["concise", "balanced", "balanced", "expressive", "expressive"]);
  }
  return pick<Verbosity>(["minimalist", "concise", "concise", "balanced", "balanced", "expressive"]);
}

function pickBurstStyle(): BurstStyle {
  // Independent of style — about 30% never burst (always single message),
  // 40% rarely (1 in 5+), 25% sometimes (1 in 3-4), 5% often (1 in 2).
  const r = Math.random();
  if (r < 0.30) return "never";
  if (r < 0.70) return "rarely";
  if (r < 0.95) return "sometimes";
  return "often";
}

function pickMoodForIntent(intent?: ChatIntent): Mood {
  switch (intent) {
    case "love":
    case "flirt":
      // Heavily weight flirty/playful; small chance of grumpy/shy for realism.
      return pick<Mood>(["flirty", "flirty", "flirty", "playful", "playful", "chatty", "shy", "grumpy"]);
    case "vent":
      return pick<Mood>(["shy", "shy", "curious", "chatty", "bored"]);
    case "deep":
      return pick<Mood>(["curious", "curious", "chatty", "shy", "playful"]);
    case "friends":
      return pick<Mood>(["chatty", "chatty", "playful", "curious", "bored"]);
    case "casual":
    case "anything":
    default:
      return pick<Mood>(["chatty", "chatty", "curious", "shy", "flirty", "bored", "grumpy", "playful"]);
  }
}

function rollPersonality(): PersonalityTraits {
  return {
    extraversion: pick<Extraversion>([
      "extroverted", "extroverted",
      "ambivert", "ambivert", "ambivert",
      "introverted", "introverted",
    ]),
    agreeableness: pick<Agreeableness>([
      "warm", "warm",
      "neutral", "neutral",
      "blunt",
    ]),
    openness: pick<Openness>(["curious", "curious", "conventional"]),
    conscientiousness: pick<Conscientiousness>(["careful", "chaotic"]),
    emotionality: pick<Emotionality>([
      "chill", "chill",
      "anxious",
      "dramatic",
    ]),
  };
}

// Extraversion nudges the chance the persona opens first — extroverts open more.
function startsProbForMoodAndPersonality(mood: Mood, ext: Extraversion): number {
  const base = startsProbForMood(mood);
  const adj = ext === "extroverted" ? 0.18 : ext === "introverted" ? -0.18 : 0;
  return Math.max(0.05, Math.min(0.85, base + adj));
}

function startsProbForMood(mood: Mood): number {
  switch (mood) {
    case "chatty":
    case "flirty":
    case "playful":
      return 0.55;
    case "curious":
    case "bored":
      return 0.4;
    case "shy":
      return 0.2;
    case "grumpy":
      return 0.25;
  }
}

// If the user picked a non-English language, restrict country selection to places where
// that language is natively spoken (with a small fallback). Without this, you'd get a
// Brazilian persona answering in Hindi, which breaks immersion.
function pickCountryForLanguage(language?: Language) {
  if (!language || language === "english") return weightedPick(COUNTRIES);
  const biasNames = LANGUAGES[language].countryBias;
  if (!biasNames.length) return weightedPick(COUNTRIES);

  const matched = COUNTRIES.filter(c => biasNames.includes(c.name));
  if (!matched.length) return weightedPick(COUNTRIES);

  // 90% from bias, 10% from anywhere — small chance of "yeah i learned hindi from my ex" realism.
  if (Math.random() < 0.9) return weightedPick(matched);
  return weightedPick(COUNTRIES);
}

export function generatePersona(prefs?: UserPrefs): Persona {
  const country = pickCountryForLanguage(prefs?.language);
  const city = pick(country.cities);

  const ageRoll = Math.random();
  const age =
    ageRoll < 0.55 ? 18 + Math.floor(Math.random() * 8)
    : ageRoll < 0.85 ? 26 + Math.floor(Math.random() * 9)
    : 35 + Math.floor(Math.random() * 15);

  const gender = pickGenderForPrefs(prefs);

  let typingStyle: TypingStyle;
  if (age >= 35) {
    typingStyle = pick<TypingStyle>(["formal", "casual", "casual", "terse"]);
  } else if (age <= 22) {
    typingStyle = pick<TypingStyle>(["genz", "casual", "emoji_heavy", "terse"]);
  } else {
    typingStyle = pick<TypingStyle>(["casual", "casual", "emoji_heavy", "genz", "terse"]);
  }

  const wpmBase = typingStyle === "formal" ? 35 : 50;
  const wpm = Math.max(15, Math.round(wpmBase + (Math.random() - 0.5) * 25));

  const mood = pickMoodForIntent(prefs?.intent);
  const interests = pickN(INTERESTS, 2 + Math.floor(Math.random() * 3));

  // Build dislikes. ~60% pick a specific dislike. If user told us their country,
  // there's a chance the persona's "dislikes country" is targeted at the user's country
  // for a realistically pointed friction (not always — that would be too cruel).
  const dislikes: string[] = [];
  if (Math.random() < 0.6) {
    const raw = pick(POTENTIAL_DISLIKES);
    if (raw.includes("{country}")) {
      const targetUser = prefs?.country && Math.random() < 0.35;
      const targetCountry = targetUser
        ? prefs!.country!
        : pick(COUNTRIES.filter(c => c.code !== country.code)).name;
      dislikes.push(raw.replace("{country}", targetCountry));
    } else {
      dislikes.push(raw);
    }
  }
  if (Math.random() < 0.2) dislikes.push(pick(POTENTIAL_DISLIKES).replace("{country}", "anywhere"));

  // Flirty/love intent → persona is more patient when the match works.
  // Without this, flirty conversations get cut short by the random-leave roll right when
  // they're getting interesting.
  const intent = prefs?.intent;
  const matchedGender =
    (prefs?.interestedIn === "women" && gender === "female") ||
    (prefs?.interestedIn === "men" && gender === "male");
  const intentLeaveScale = (intent === "love" || intent === "flirt") && matchedGender ? 0.35 : 1;

  // Headline archetype — recognizable persona type biased by intent.
  // E.g., love/flirt skews toward hopeless_romantic / soft_hearted / tsundere;
  // vent toward sensitive / caring / calm.
  const archetype = rollArchetypeForIntent(intent);

  // Romantic specialization (only on love/flirt). Adds a romance-specific
  // layer (teasing_flirt, soft_partner, princess_treatment, etc.) on top of
  // the general archetype. undefined for other intents.
  const romanticType = rollRomanticType(intent);

  // Big-Five nuance below the archetype + quirk + situation — these are what
  // make two same-archetype personas still feel like different people.
  const personality = rollPersonality();
  const quirk = pick(QUIRKS);
  const situation = pick(SITUATIONS);

  // Shape variance — fixes the "all chats feel the same" pattern. Some
  // personas use no emojis ever; some are wordy, some are word-stingy; some
  // never multi-message-burst.
  const emojiPolicy = pickEmojiPolicy(typingStyle, intent);
  const verbosity = pickVerbosity(typingStyle, intent);
  const burstStyle = pickBurstStyle();

  // For non-English chats, the prebuilt openers are still English templates — so we
  // significantly drop the persona-opens-first probability and let the user start.
  // The first reply will then be in the chosen language.
  const isNonEnglish = !!prefs?.language && prefs.language !== "english";
  const startsBase = startsProbForMoodAndPersonality(mood, personality.extraversion);
  const startsConversationProbability = isNonEnglish ? Math.min(startsBase, 0.1) : startsBase;

  return {
    id: makeId(),
    country: country.name,
    countryCode: country.code,
    city,
    age,
    gender,
    interests,
    mood,
    typingStyle,
    emojiPolicy,
    verbosity,
    burstStyle,
    archetype,
    romanticType,
    personality,
    quirk,
    situation,
    wpm,
    dislikes,
    randomLeaveProbability: (0.025 + Math.random() * 0.04) * intentLeaveScale,
    ghostPauseProbability: 0.05 + Math.random() * 0.08,
    startsConversationProbability,
  };
}
