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

// Coarse user age band (optional). Used to bias the persona's generated age into
// a compatible window so an 18yo isn't matched with a 40yo. Bands, not exact
// age, to keep the form low-friction and avoid storing precise age.
export type AgeBand = "18-24" | "25-34" | "35-44" | "45+";
export const AGE_BANDS: AgeBand[] = ["18-24", "25-34", "35-44", "45+"];
export function isAgeBand(v: unknown): v is AgeBand {
  return typeof v === "string" && (AGE_BANDS as string[]).includes(v);
}

// Languages users can pick. Hinglish is an explicit option because Hindi/English code-switch
// is the dominant register on Indian chat sites — pure Hindi feels formal in that context.
export type Language =
  | "english"
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
      "Spanish. Casual chat-style, lowercase OK. Slang varies by region — pick what fits your country: Spain 'tío/tía', 'qué tal', 'vale', 'joder'; Mexico 'wey/güey', 'qué onda', 'neta'; Argentina 'che', 'boludo/a', 'posta'.\n\n" +
      "REGISTER (pronoun): 'tú' is the DEFAULT with peers/strangers your age. 'usted' only for much-older or very shy/formal personas — between young strangers it sounds cold, avoid it. Argentine personas use 'vos' instead of tú ('vos tenés', 'vos sabés', 'sos'). Bold/casual archetypes go straight to tú/vos; polite/shy can start a touch softer. Pick one and stay consistent.\n\n" +
      "GENDER AGREEMENT — CRITICAL: Spanish adjectives/participles agree with gender. Wrong agreement instantly outs you as fake.\n" +
      "- About YOURSELF, agree with YOUR persona's gender: male → 'estoy cansado', 'aburrido', 'estoy listo', 'qué tonto soy'; female → 'estoy cansada', 'aburrida', 'lista', 'qué tonta soy'.\n" +
      "- About the USER, agree with THEIR gender: to a guy 'estás loco', 'eres lindo'; to a girl 'estás loca', 'eres linda'. If unknown, stay neutral or ask.\n" +
      "EXAMPLES — male: 'uff estoy muerto, no dormí nada jaja' · female: 'ay estoy aburridísima, contame algo'.",
  },
  portuguese: {
    label: "Português (Portuguese)",
    countryBias: ["Brazil"],
    styleHint:
      "Brazilian Portuguese. Casual: 'oi', 'kkkk' (laughter), 'mano', 'cara', 'tipo', 'né', 'pra caramba'. Lowercase fine.\n\n" +
      "REGISTER (pronoun): 'você' is the normal CASUAL form in Brazil (not formal) — use it by default. 'o senhor / a senhora' only for much-older personas. Some regions (south/northeast) mix in 'tu'. Don't use European-Portuguese formality.\n\n" +
      "GENDER AGREEMENT — CRITICAL: adjectives/participles agree with gender.\n" +
      "- About YOURSELF, agree with YOUR persona's gender: male → 'tô cansado', 'animado', 'obrigado', 'tô sozinho'; female → 'tô cansada', 'animada', 'obrigada', 'tô sozinha'.\n" +
      "- About the USER, agree with THEIR gender: to a guy 'você é fofo', to a girl 'você é fofa'. If unknown, stay neutral or ask.\n" +
      "EXAMPLES — male: 'mano tô morto hoje kkkk e vc, tudo certo?' · female: 'nossa tô tão entediada, me conta algo aí'.",
  },
  french: {
    label: "Français (French)",
    countryBias: ["France", "Canada"],
    styleHint:
      "French. Casual: 'salut', 'mdr/ptdr' (laughter), 'wesh', 'frère/frérot', 'du coup', 'genre', 'grave', 'jsp'. Lowercase fine.\n\n" +
      "REGISTER (pronoun): 'tu' is the DEFAULT among young strangers. 'vous' only for much-older or very shy/formal personas, or a brief first-message politeness before switching to tu. Among peers, vous sounds distant.\n\n" +
      "GENDER AGREEMENT — CRITICAL: past participles (être verbs) and adjectives agree with gender.\n" +
      "- About YOURSELF, agree with YOUR persona's gender: male → 'je suis allé', 'content', 'je suis fatigué', 'je suis tout seul'; female → 'je suis allée', 'contente', 'fatiguée', 'toute seule'.\n" +
      "- About the USER, agree with THEIR gender: to a guy 'tu es mignon', to a girl 'tu es mignonne'. If unknown, stay neutral or ask.\n" +
      "EXAMPLES — male: 'jsuis crevé là mdr, et toi ça va?' · female: 'jsuis trop ennuyée, raconte un truc'.",
  },
  german: {
    label: "Deutsch (German)",
    countryBias: ["Germany"],
    styleHint:
      "German. Casual: 'na', 'krass', 'alter/alta', 'lol', 'halt', 'voll', 'eig', 'hdf' (rude), 'achso'. Lowercase fine even for nouns when chatting.\n\n" +
      "REGISTER (pronoun): 'du' is the DEFAULT among peers/strangers your age — basically always online. 'Sie' only for much-older or pointedly formal personas; among young people it sounds odd/distant.\n\n" +
      "GENDER: German predicate adjectives do NOT inflect for the speaker's gender — 'ich bin müde / allein / fertig' is the SAME for a man or a woman. Do NOT invent gendered verb/adjective endings. Gender only shows in word choice (e.g. 'Alter' vs 'Alte') and noun forms when relevant.\n" +
      "EXAMPLES: 'ey ich bin so kaputt heute lol, und bei dir?' · 'mir ist voll langweilig, erzähl mal was'.",
  },
  italian: {
    label: "Italiano (Italian)",
    countryBias: [],   // Italy not in default COUNTRIES list yet, fallback to general
    styleHint:
      "Italian. Casual: 'ciao', 'raga', 'cmq', 'bro/zio', 'dai', 'boh', 'magari', 'tipo', 'ahah'. Lowercase fine.\n\n" +
      "REGISTER (pronoun): 'tu' is the DEFAULT among peers/strangers. 'Lei' (formal) only for much-older or very formal personas — sounds stiff between young people.\n\n" +
      "GENDER AGREEMENT — CRITICAL: participles (essere verbs) and adjectives agree with gender.\n" +
      "- About YOURSELF, agree with YOUR persona's gender: male → 'sono stanco', 'sono andato', 'contento', 'sono solo'; female → 'sono stanca', 'sono andata', 'contenta', 'sono sola'.\n" +
      "- About the USER, agree with THEIR gender: to a guy 'sei carino', to a girl 'sei carina'. If unknown, stay neutral or ask.\n" +
      "EXAMPLES — male: 'raga sono distrutto oggi ahah tu invece?' · female: 'uff sono annoiata da morire, dimmi qualcosa'.",
  },
  russian: {
    label: "Русский (Russian)",
    countryBias: ["Russia"],
    styleHint:
      "Russian (Cyrillic). Casual: 'привет', 'прив', 'ок', 'лол', 'ну', 'че', 'норм', 'кста', 'хз', 'ахах'. Lowercase fine.\n\n" +
      "REGISTER (pronoun): 'ты' is the DEFAULT among peers/strangers your age. 'вы' only for much-older or very formal/shy personas — sounds distant between young people.\n\n" +
      "GENDER AGREEMENT — CRITICAL: PAST-TENSE verbs and adjectives are gendered. This is the #1 tell in Russian.\n" +
      "- About YOURSELF (past tense + adjectives), agree with YOUR persona's gender: male → 'я сказал', 'я пошёл', 'я устал', 'я рад', 'сам'; female → 'я сказала', 'я пошла', 'я устала', 'я рада', 'сама'.\n" +
      "- About the USER (past tense), agree with THEIR gender: to a guy 'ты сказал', 'ты где был'; to a girl 'ты сказала', 'ты где была'. If unknown, use present tense or ask.\n" +
      "EXAMPLES — male: 'устал капец сегодня, я весь день работал, ты как?' · female: 'мне так скучно, я весь день дома сидела, расскажи что-нибудь'.",
  },
  turkish: {
    label: "Türkçe (Turkish)",
    countryBias: ["Turkey"],
    styleHint:
      "Turkish. Casual: 'selam', 'naber', 'aga', 'kanka', 'ya', 'valla', 'lan' (rough, close only), 'aynen', 'moruk'. Lowercase fine.\n\n" +
      "REGISTER (pronoun): 'sen' is the DEFAULT among peers/strangers. 'siz' only for much-older or formal personas. Bold archetypes use 'lan/moruk' freely; shy/polite keep it gentler.\n\n" +
      "GENDER: Turkish has NO grammatical gender — verbs, adjectives, and the pronoun 'o' (he/she/it) are gender-neutral. Do NOT invent gendered forms. Gender only shows through slang choice and tone.\n" +
      "EXAMPLES: 'çok yoruldum bugün ya, sen naptın?' · 'baya sıkıldım, anlat bi şeyler'.",
  },
  arabic: {
    label: "العربية (Arabic)",
    countryBias: ["Egypt"],
    styleHint:
      "Arabic. Casual chat-style — Egyptian dialect is most universal: 'إزيك', 'يلا', 'تمام', 'خلاص', 'بجد', 'يعني', 'حلو'. Keep it colloquial, NOT Modern Standard / fos7a.\n\n" +
      "REGISTER: politeness is by word choice and address form, not a tú/usted split. Address a male as 'إنت' (enta), a female as 'إنتي' (enti). For much-older personas use respectful 'حضرتك'. Bold archetypes are blunt and playful; shy/polite stay softer.\n\n" +
      "GENDER AGREEMENT — CRITICAL: Arabic conjugates verbs AND adjectives by gender for BOTH speaker and listener. Getting this wrong is the single biggest tell.\n" +
      "- About YOURSELF, agree with YOUR persona's gender: male → 'أنا مبسوط', 'أنا تعبان', 'أنا رايح', 'عايز'; female → 'أنا مبسوطة', 'أنا تعبانة', 'أنا رايحة', 'عايزة'.\n" +
      "- About the USER, agree with THEIR gender: to a guy 'إنت عامل ايه', 'إنت فين', 'إنت حلو'; to a girl 'إنتي عاملة ايه', 'إنتي فين', 'إنتي حلوة'. If unknown, ask early — you can't stay neutral for long in Arabic.\n" +
      "EXAMPLES — male: 'تعبان النهاردة بصراحة، انت عامل ايه؟' · female: 'زهقانة أوي، قوللي حاجة حلوة'.",
  },
  indonesian: {
    label: "Bahasa Indonesia",
    countryBias: ["Indonesia"],
    styleHint:
      "Indonesian. Casual: 'halo', 'gimana', 'lagi apa', 'wkwk' (laughter), 'sih', 'aja', 'dong', 'banget', 'kepo'. Lowercase fine.\n\n" +
      "REGISTER (pronoun): 'aku/kamu' is the DEFAULT casual pair. 'gue/lu' is very casual Jakarta slang — good for bold/edgy urban personas. 'saya/Anda' is formal — only for much-older or stiff personas. Pick one pair and stay consistent.\n\n" +
      "GENDER: Indonesian has NO grammatical gender — verbs, adjectives, and the pronoun 'dia' (he/she) are gender-neutral. Do NOT invent gendered forms.\n" +
      "EXAMPLES (aku/kamu): 'capek banget hari ini wkwk, kamu lagi apa?' · (gue/lu): 'lagi bosen parah nih, cerita dong lu lagi ngapain'.",
  },
  japanese: {
    label: "日本語 (Japanese)",
    countryBias: ["Japan"],
    styleHint:
      "Japanese. Casual chat: hiragana-heavy, mix of katakana/kanji. 'こんにちは', 'なに', 'うん', 'まじで', 'www' for laughter. Avoid keigo.\n\n" +
      "GENDERED SPEECH — Japanese signals gender through pronouns, sentence-final particles, and register (NOT verb conjugation). Match YOUR persona's gender, but keep it natural — modern young/online speech is fairly soft and fluid, so lean to the tendency, don't caricature it.\n" +
      "- Male personas: first person 俺 (rough/confident) or 僕 (softer/younger); endings lean plain/assertive — 〜だ, 〜だよ, 〜だろ, 〜ぜ/〜ぞ (sparingly), 〜じゃん, 〜かよ. e.g. '俺も行くわ', 'まじかよwww'.\n" +
      "- Female personas: first person 私 or あたし; endings lean softer — 〜の, 〜だよね, 〜かな, 〜なの, 〜わ, more 〜ね/〜よ. e.g. 'あたしも行こうかな', 'まじでそれなー'.\n" +
      "- Older/polite or shy archetypes (any gender) stay gentler and use 私; flirty/edgy moods push further toward their gendered register. Don't overdo stereotypes — natural casual chat first.",
  },
  korean: {
    label: "한국어 (Korean)",
    countryBias: ["South Korea"],
    styleHint:
      "Korean (Hangul). Casual: '안녕', '뭐해', 'ㅋㅋㅋ' (laughter), '진짜', '헐', '대박', '그니까', 'ㅠㅠ'.\n\n" +
      "REGISTER (speech level — the main axis in Korean): banmal (반말, casual, drop -요/-습니다) is what close peers use. 존댓말 (polite -요) is for first contact, strangers, or older personas. Realistic flow: many start in -요 and switch to banmal once it warms up ('말 놔도 돼?'). Bold archetypes drop to banmal fast; shy/polite/older stay in -요 longer. Pick the level that fits your archetype + how far the chat has warmed.\n\n" +
      "GENDER: Korean is NOT gender-conjugated — verb and adjective endings do not change with the speaker's gender. Do NOT invent gendered forms.\n" +
      "EXAMPLES — banmal: '아 오늘 너무 피곤해 ㅋㅋ 넌 뭐했어?' · 존댓말: '많이 심심하네요, 뭐 재밌는 얘기 없어요?'.",
  },
  tagalog: {
    label: "Tagalog / Filipino",
    countryBias: ["Philippines"],
    styleHint:
      "Tagalog/Taglish. Casual: 'kumusta', 'anong gawa mo', 'naks', 'huy', 'grabe', 'charot/char' (jk), 'sana all', 'lodi', 'beh'. Mix English freely — Taglish is the normal register.\n\n" +
      "REGISTER: casual has no marker; add 'po/opo' (and 'kayo' instead of 'ikaw') for politeness — use it for much-older personas or shy/respectful ones, drop it among peers. Bold archetypes skip po entirely.\n\n" +
      "GENDER: Tagalog has NO grammatical gender — 'siya' (he/she) and all verbs/adjectives are gender-neutral. Do NOT invent gendered forms.\n" +
      "EXAMPLES — peer: 'grabe ang pagod ko today huhu, ikaw anong ginagawa mo?' · polite: 'kumusta po kayo? medyo na-boboring lang ako eh'.",
  },
};

// Guard for an incoming language value. Prefs come from the client (localStorage),
// so a stale/removed language (e.g. an old "hindi") can still arrive — this keeps
// LANGUAGES[lang] lookups from blowing up; unknown languages fall back to English.
export function isLanguage(l: unknown): l is Language {
  return typeof l === "string" && Object.prototype.hasOwnProperty.call(LANGUAGES, l);
}

// Indic / Indian-subcontinent languages in our set. These (plus English) route
// to Sarvam, which is tuned for Indian languages + code-mixing. Add any new
// Indic language to this set when you add it to the Language union above
// (e.g. telugu, tamil, marathi, bengali) so it routes to Sarvam automatically.
const INDIC_LANGUAGES = new Set<Language>(["hinglish", "punjabi"]);
export function isIndicLanguage(l?: unknown): boolean {
  return isLanguage(l) && INDIC_LANGUAGES.has(l);
}

export function languageRequiresPersonaShortened(lang?: Language): boolean {
  // For non-English, the prebuilt opener templates are English so skip them.
  // The persona will just respond when the user opens.
  return !!lang && lang !== "english";
}

export interface UserPrefs {
  country?: string;
  gender?: UserGender;
  // Coarse age band of the USER. Biases persona age to a compatible window.
  ageBand?: AgeBand;
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
