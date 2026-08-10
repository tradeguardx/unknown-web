// Scene / environment registry (TS config). Drives the picker cards, the dark
// immersive backdrop on the date screens, AND a small prompt-flavor block so the
// persona is IN the place. "the place changes how she talks" — howItChanges is the
// one-liner shown on the picker. Add a scene = add an entry here.

import type { SceneDef } from "./types";

const MEDIA = "https://eppdibglxxapupwgssxu.supabase.co/storage/v1/object/public/media";

export const SCENES: Record<string, SceneDef> = {
  coffee_shop: {
    id: "coffee_shop", type: "coffee_shop", cardImage: `${MEDIA}/coffee_shop_selected.png`,
    label: "the coffee shop", subtitle: "snow outside · evening · the good corner table",
    location: "hill-town café", time: "evening", weather: "snow", ambience: "cozy", sound: true,
    howItChanges: "warms her up — she lingers, she teases.",
    backgroundSounds: ["snow", "coffee_machine", "soft_crowd", "lofi"],
    visualTheme: "warm_coffee_shop",
    darkTheme: { from: "#3a2f36", via: "#4a3a44", to: "#6b4a52" },
    emoji: "☕",
    promptFlavor:
      "You're in a cozy coffee shop in a snowy hill town, early evening, at the good corner table. Snow drifts past the fogging window, the machine hisses, low lo-fi and quiet chatter. Let the cold outside, your drinks, and the warm room color the moment.",
  },
  mountain_cabin: {
    id: "mountain_cabin", type: "cabin", cardImage: `${MEDIA}/mountain_cabin.png`,
    label: "the mountain cabin", subtitle: "snow · fireplace · no signal",
    location: "cabin in the pines", time: "night", weather: "snow", ambience: "intimate", sound: true,
    howItChanges: "makes her honest — nowhere to hide up here.",
    backgroundSounds: ["fire", "wind", "wood_creak"],
    visualTheme: "cabin_night",
    darkTheme: { from: "#2a2620", via: "#3d3128", to: "#5c4632" },
    emoji: "🛖",
    promptFlavor:
      "You're snowed into a small mountain cabin at night — a fireplace crackling, no phone signal, just the two of you and the storm outside. It's the kind of quiet that makes people say true things.",
  },
  beach: {
    id: "beach", type: "beach", cardImage: `${MEDIA}/beach.png`,
    label: "the beach", subtitle: "sunset · warm wind · nobody",
    location: "empty coast", time: "sunset", weather: "clear", ambience: "relaxed", sound: true,
    howItChanges: "slows her down — she opens up easy.",
    backgroundSounds: ["waves", "gulls", "breeze"],
    visualTheme: "beach_sunset",
    darkTheme: { from: "#3a2b33", via: "#6b4247", to: "#a55a3e" },
    emoji: "🌅",
    promptFlavor:
      "You're walking an empty beach at sunset — waves rolling in, warm wind, gold light, nobody around. Unhurried, the kind of setting where people actually open up.",
  },
  rooftop: {
    id: "rooftop", type: "rooftop", cardImage: `${MEDIA}/rooftop.png`,
    label: "the rooftop", subtitle: "city lights · 1am · cold beer",
    location: "city rooftop", time: "1am", weather: "clear", ambience: "bold", sound: true,
    howItChanges: "makes her bold — the height does something.",
    backgroundSounds: ["city_hum", "breeze", "distant_music"],
    visualTheme: "city_rooftop_night",
    darkTheme: { from: "#26243a", via: "#3a3560", to: "#5a4d84" },
    emoji: "🌆",
    promptFlavor:
      "You're on a quiet rooftop at 1am, city lights glowing below, a cold beer each, faint music somewhere. It's a little intimate up here — just the two of you and the skyline.",
  },
  library: {
    id: "library", type: "library", cardImage: `${MEDIA}/library.png`,
    label: "the library", subtitle: "whispering only · closing soon",
    location: "old library", time: "late afternoon", weather: "rain", ambience: "quiet", sound: true,
    howItChanges: "makes her precise — every word counts here.",
    backgroundSounds: ["rain", "pages", "hush"],
    visualTheme: "cozy_library",
    darkTheme: { from: "#2b2822", via: "#3a352b", to: "#514735" },
    emoji: "📚",
    promptFlavor:
      "You're tucked in an old library as it rains outside and the lights blink 'closing soon'. Tall shelves, the smell of paper, everyone whispering. You keep half-noticing books as you talk.",
  },
  night_train: {
    id: "night_train", type: "train", cardImage: `${MEDIA}/night_train.png`,
    label: "the night train", subtitle: "six hours · facing seats",
    location: "overnight train", time: "night", weather: "clear", ambience: "intimate", sound: true,
    howItChanges: "loosens her up — strangers on a train say anything.",
    backgroundSounds: ["train_clack", "rain_window", "low_hum"],
    visualTheme: "night_train",
    darkTheme: { from: "#222430", via: "#333650", to: "#4a4d70" },
    emoji: "🚆",
    promptFlavor:
      "You're on an overnight train, six hours to go, facing seats, dark countryside sliding past the window. That strange intimacy of strangers who'll never see each other again — so you both get honest.",
  },
  campsite: {
    id: "campsite", type: "campsite", cardImage: `${MEDIA}/campsite.png`,
    label: "the campsite", subtitle: "stars · low fire · no one for miles",
    location: "wild campsite", time: "night", weather: "clear", ambience: "warm", sound: true,
    howItChanges: "makes her gentle — the dark and the fire do that.",
    backgroundSounds: ["fire", "crickets", "wind"],
    visualTheme: "campsite_night",
    darkTheme: { from: "#232a26", via: "#33402f", to: "#4a5a3a" },
    emoji: "🏕",
    promptFlavor:
      "You're at a wild campsite under a huge field of stars, a low fire between you, no one for miles. Quiet, warm, unhurried — the dark makes it easy to be gentle and real.",
  },
  bookstore_rain: {
    id: "bookstore_rain", type: "bookstore", cardImage: `${MEDIA}/bookstore.png`,
    label: "the bookstore", subtitle: "rain · tall shelves · the smell of paper",
    location: "old-town bookstore", time: "afternoon", weather: "rain", ambience: "quiet", sound: true,
    howItChanges: "makes her thoughtful — she wanders as she talks.",
    backgroundSounds: ["rain", "pages", "soft_crowd"],
    visualTheme: "cozy_bookstore",
    darkTheme: { from: "#2b2822", via: "#3a352b", to: "#514735" },
    emoji: "📖",
    promptFlavor:
      "You're in a little old-town bookstore while it rains outside — tall shelves, the smell of paper, quiet. You keep half-noticing books as you talk.",
  },
};

export function getScene(id: string): SceneDef | null {
  return SCENES[id] ?? null;
}

export function listScenes(): SceneDef[] {
  return Object.values(SCENES);
}
