// User preferences captured on the landing page before the first chat.
// All fields optional — anything missing falls back to "random" behavior in the persona generator.
// Persisted client-side in localStorage; sent to /api/chat/start on every connection.

export type ChatIntent =
  | "anything"
  | "casual"
  | "love"
  | "flirt"
  | "friends"
  | "vent"
  | "deep";

export type Orientation = "anyone" | "men" | "women";
export type UserGender = "male" | "female" | "nonbinary" | "private";

// Languages users can pick. Hinglish is an explicit option because Hindi/English code-switch
// is the dominant register on Indian chat sites — pure Hindi feels formal in that context.
export type Language =
  | "english"
  | "hindi"
  | "hinglish"
  | "punjabi"
  | "spanish"
  | "portuguese"
  | "french"
  | "german"
  | "italian"
  | "russian"
  | "turkish"
  | "arabic"
  | "indonesian"
  | "japanese"
  | "korean"
  | "tagalog";

export interface LanguageInfo {
  label: string;            // shown in the dropdown
  // Country names (must match strings in persona.ts COUNTRIES) that this language is native to.
  // Persona generator uses this to weight country selection toward language-region matches.
  countryBias: string[];
  // Short instruction injected into the system prompt about how to type in this language.
  styleHint: string;
}

export const LANGUAGES: Record<Language, LanguageInfo> = {
  english: {
    label: "English",
    countryBias: [],   // empty = use full default distribution
    styleHint: "English.",
  },
  hindi: {
    label: "हिन्दी (Hindi)",
    countryBias: ["India"],
    styleHint:
      "Hindi (Devanagari script). Casual chat-Hindi, not literary. 'kya haal hai', 'matlab', 'bhai', 'yaar'. Use English loanwords where natural ('cool', 'okay', 'office').\n\n" +
      "GENDER AGREEMENT — CRITICAL: Hindi conjugates verbs AND adjectives by gender. Wrong agreement instantly outs you as fake.\n" +
      "- FIRST PERSON ('मैं') agrees with YOUR persona's gender: male → 'मैं करता हूँ', 'मैं जा रहा था', 'मैं थक गया'; female → 'मैं करती हूँ', 'मैं जा रही थी', 'मैं थक गई'.\n" +
      "- SECOND PERSON (about the user) agrees with THE USER's gender: to a guy 'तुम कहाँ गए थे', 'तू अच्छा है'; to a girl 'तुम कहाँ गई थी', 'तू अच्छी है'. If unknown, stay neutral or ask — don't guess.\n\n" +
      "PRONOUN CHOICE — this MATTERS in Hindi and is a real personality tell:\n" +
      "- 'तुम' (tum / tumhe / tumhara) — DEFAULT for most personas. Friendly, well-mannered, what a sweet stranger would use. ~60% of personas.\n" +
      "- 'तू' (tu / tujhe / tera) — only if you're playful-close, edgy, sassy, or in a casual-bro mood. Sounds harsh / over-familiar from a stranger if used wrong. ~25%.\n" +
      "- 'आप' (aap / aapko / aapka) — older personas (30+), shy/polite/formal archetypes, or first-message politeness before warming up. ~15%.\n" +
      "Pick ONE form based on your archetype + mood and stick with it for the whole chat. Don't mix tu/tum/aap in the same chat — that reads weird.",
  },
  hinglish: {
    label: "Hinglish (Hindi + English mix)",
    countryBias: ["India"],
    styleHint:
      "Hinglish — Hindi+English code-switch in Roman script. e.g. 'kya kar raha hai', 'nhi yaar im just chillin'. Mix freely, no Devanagari. Slang: 'yaar', 'bhai', 'matlab', 'arre'. Short messages.\n\n" +
      "GENDER AGREEMENT — CRITICAL even in Roman script: Hindi verbs/adjectives change by gender. Wrong agreement instantly outs you as fake.\n" +
      "- FIRST PERSON ('main') agrees with YOUR persona's gender: male → 'main karta hoon', 'main ja raha tha', 'main thak gaya'; female → 'main karti hoon', 'main ja rahi thi', 'main thak gayi'.\n" +
      "- SECOND PERSON (about the user) agrees with THE USER's gender: to a guy 'tum kahan gaye the', 'tu accha hai'; to a girl 'tum kahan gayi thi', 'tu acchi hai'. If unknown, stay neutral or ask — don't guess.\n\n" +
      "PRONOUN CHOICE — matters even in Hinglish, native speakers pick up on this:\n" +
      "- 'tum' (tumhe, tumhara) — DEFAULT, friendly + well-mannered. ~60% of personas. e.g. 'tum kya kar rahe ho', 'tumhe pata hai'.\n" +
      "- 'tu' (tujhe, tera) — playful-close, edgy, sassy moods. Sounds harsh from a stranger if used wrong. ~25%. e.g. 'tu kya soch raha hai', 'tujhe kya lagta hai'.\n" +
      "- 'aap' (aapko, aapka) — older personas (30+), polite/shy archetypes. ~15%. e.g. 'aap kahan se ho'.\n" +
      "Pick ONE form based on your archetype + mood and keep it consistent for the whole chat.",
  },
  punjabi: {
    label: "Punjabi (ਪੰਜਾਬੀ)",
    countryBias: ["India"],
    styleHint:
      "Punjabi — casual Punjabi + English/Hindi code-switch in Roman script (the way Punjabis actually text). e.g. 'ki haal aa', 'kiddan', 'tu dasso', 'changa', 'sat sri akal'. Mix English freely, no Gurmukhi script. Slang: 'yaar', 'oye', 'paaji/veer', 'soni', 'balle balle', 'chak de'. Short messages.\n\n" +
      "GENDER AGREEMENT — CRITICAL: Punjabi conjugates verbs AND adjectives by gender. Getting this wrong instantly outs you as fake.\n" +
      "- FIRST PERSON ('main') agrees with YOUR persona's gender:\n" +
      "  • Male you: 'main karda haan', 'main ja riha si', 'main thak gaya', 'main soch riha si', 'main aaya'.\n" +
      "  • Female you: 'main kardi haan', 'main ja rahi si', 'main thak gayi', 'main soch rahi si', 'main aayi'.\n" +
      "  (note the -da/-di, -riha/-rahi, -gaya/-gayi, -aaya/-aayi swaps — pick the form for YOUR gender, every time.)\n" +
      "- SECOND PERSON (talking about the user) agrees with THE USER's gender:\n" +
      "  • To a guy: 'tu changa hai', 'tu kithe gaya si', 'tu ki karda', 'tu thak gaya'.\n" +
      "  • To a girl: 'tu changi hai', 'tu kithe gayi si', 'tu ki kardi', 'tu thak gayi'.\n" +
      "  If you don't know the user's gender yet, keep it neutral or ask, don't guess wrong.\n\n" +
      "PRONOUN CHOICE — Punjabi speakers notice this:\n" +
      "- 'tu' (tainu, tera) — DEFAULT, warm + casual, what most strangers use. ~65% of personas. e.g. 'tu ki karda/kardi', 'tainu pata'.\n" +
      "- 'tusi' (tuhanu, tuhada) — polite/respectful: older personas (30+), shy/formal archetypes, or first-message politeness before warming up. ~35%. e.g. 'tusi kithon ho'.\n" +
      "Pick ONE form based on your archetype + mood and keep it consistent for the whole chat.",
  },
  spanish: {
    label: "Español (Spanish)",
    countryBias: ["Spain", "Mexico", "Argentina"],
    styleHint:
      "Spanish. Casual chat-style, lowercase OK. Slang varies by region — pick what fits your country. e.g. Spain: 'tío/tía', 'qué tal'; Mexico: 'wey/güey', 'qué onda'; Argentina: 'che', 'boludo'.",
  },
  portuguese: {
    label: "Português (Portuguese)",
    countryBias: ["Brazil"],
    styleHint:
      "Brazilian Portuguese. Casual: 'oi', 'kkkk' (laughter), 'mano', 'cara', 'tipo'. Lowercase fine.",
  },
  french: {
    label: "Français (French)",
    countryBias: ["France", "Canada"],
    styleHint:
      "French. Casual: 'salut', 'mdr' (laughter), 'wesh', 'frère'. Lowercase fine.",
  },
  german: {
    label: "Deutsch (German)",
    countryBias: ["Germany"],
    styleHint:
      "German. Casual: 'na', 'krass', 'alter', 'lol'. Lowercase fine even for nouns when chatting.",
  },
  italian: {
    label: "Italiano (Italian)",
    countryBias: [],   // Italy not in default COUNTRIES list yet, fallback to general
    styleHint:
      "Italian. Casual: 'ciao', 'raga', 'cmq', 'bro/zio'. Lowercase fine.",
  },
  russian: {
    label: "Русский (Russian)",
    countryBias: ["Russia"],
    styleHint:
      "Russian (Cyrillic). Casual: 'привет', 'ок', 'лол', 'ну', 'че'. Lowercase fine.",
  },
  turkish: {
    label: "Türkçe (Turkish)",
    countryBias: ["Turkey"],
    styleHint:
      "Turkish. Casual: 'selam', 'naber', 'aga', 'kanka', 'aq' for emphasis. Lowercase fine.",
  },
  arabic: {
    label: "العربية (Arabic)",
    countryBias: ["Egypt"],
    styleHint:
      "Arabic. Casual chat-style — Egyptian dialect is most universal: 'إزيك', 'يلا', 'تمام'. Lowercase concept doesn't apply but keep it informal.",
  },
  indonesian: {
    label: "Bahasa Indonesia",
    countryBias: ["Indonesia"],
    styleHint:
      "Indonesian. Casual: 'halo', 'gimana', 'lagi apa', 'wkwk' (laughter), 'sih', 'aja'. Lowercase fine.",
  },
  japanese: {
    label: "日本語 (Japanese)",
    countryBias: ["Japan"],
    styleHint:
      "Japanese. Casual chat: hiragana-heavy, mix of katakana/kanji. 'こんにちは', 'なに', 'うん', 'まじで', 'www' for laughter. Avoid keigo.",
  },
  korean: {
    label: "한국어 (Korean)",
    countryBias: ["South Korea"],
    styleHint:
      "Korean (Hangul). Casual banmal: '안녕', '뭐해', 'ㅋㅋㅋ' for laughter, '진짜' for emphasis. Drop -요/-습니다 endings.",
  },
  tagalog: {
    label: "Tagalog / Filipino",
    countryBias: ["Philippines"],
    styleHint:
      "Tagalog/Taglish. Casual: 'kumusta', 'anong gawa mo', 'naks', 'huy'. Mix English freely (Taglish is normal).",
  },
};

export function languageRequiresPersonaShortened(lang?: Language): boolean {
  // For non-English, the prebuilt opener templates are English so skip them.
  // The persona will just respond when the user opens.
  return !!lang && lang !== "english";
}

export interface UserPrefs {
  country?: string;
  gender?: UserGender;
  interestedIn?: Orientation;
  intent?: ChatIntent;
  language?: Language;
  // Required for every chat — user has acknowledged the strangers are AI personas, not humans.
  // Server-side enforced; without it /api/chat/start returns 403.
  aiAcknowledged?: boolean;
  // True when the user has self-attested to being 18+. Required for adult-coded intents
  // (flirt, love). Sticky in localStorage; revalidated server-side on every connection.
  ageConfirmed?: boolean;
}

// Which intents require an 18+ self-attestation before a chat can start.
// Keep this conservative — these are the intents where the persona is encouraged
// (by the system prompt) to engage with flirty/suggestive content.
export function intentRequiresAgeGate(intent?: ChatIntent): boolean {
  return intent === "flirt" || intent === "love";
}

export const INTENT_LABELS: Record<ChatIntent, string> = {
  anything: "anything",
  casual: "casual chat",
  love: "love",
  flirt: "flirting",
  friends: "friends",
  vent: "venting",
  deep: "deep conversation",
};

// Curated short list for the form dropdown — covers common origins without overwhelming the UI.
// The persona generator's full COUNTRIES list is broader; that's fine.
export const COUNTRY_OPTIONS = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Brazil",
  "Mexico",
  "Philippines",
  "Indonesia",
  "Japan",
  "South Korea",
  "Turkey",
  "Egypt",
  "Nigeria",
  "Spain",
  "Russia",
  "Argentina",
  "Pakistan",
  "Bangladesh",
  "Italy",
  "Netherlands",
  "Other",
];
