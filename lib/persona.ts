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

  // For non-English chats, the prebuilt openers are still English templates — so we
  // significantly drop the persona-opens-first probability and let the user start.
  // The first reply will then be in the chosen language.
  const isNonEnglish = !!prefs?.language && prefs.language !== "english";
  const startsBase = startsProbForMood(mood);
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
    wpm,
    dislikes,
    randomLeaveProbability: (0.025 + Math.random() * 0.04) * intentLeaveScale,
    ghostPauseProbability: 0.05 + Math.random() * 0.08,
    startsConversationProbability,
  };
}
