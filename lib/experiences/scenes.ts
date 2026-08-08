// Scene / environment registry (TS config). Drives the visual theme + ambient
// audio on the client AND a small prompt-flavor block so the persona is IN the
// place. Add a scene = add an entry (+ a visualTheme/sounds the client knows).

import type { SceneDef } from "./types";

export const SCENES: Record<string, SceneDef> = {
  coffee_shop_snow: {
    id: "coffee_shop_snow",
    type: "coffee_shop",
    location: "hill town",
    time: "evening",
    weather: "snow",
    ambience: "cozy",
    backgroundSounds: ["snow", "coffee_machine", "soft_crowd", "music"],
    visualTheme: "warm_coffee_shop",
    emoji: "☕",
    promptFlavor:
      "You're in a cozy little coffee shop in a snowy hill town, early evening. Snow drifts past the window, the coffee machine hisses now and then, soft music, low chatter around you. Let the setting color the moment naturally — the cold outside, your drinks, the view.",
  },
  rooftop_night: {
    id: "rooftop_night",
    type: "rooftop",
    location: "city",
    time: "night",
    weather: "clear",
    ambience: "intimate",
    backgroundSounds: ["city_hum", "breeze", "distant_music"],
    visualTheme: "city_rooftop_night",
    emoji: "🌆",
    promptFlavor:
      "You're on a quiet rooftop at night, city lights glowing below, a cool breeze, faint music from somewhere. It's a little intimate up here — just the two of you and the skyline.",
  },
  beach_sunset: {
    id: "beach_sunset",
    type: "beach",
    location: "coast",
    time: "sunset",
    weather: "clear",
    ambience: "relaxed",
    backgroundSounds: ["waves", "gulls", "breeze"],
    visualTheme: "beach_sunset",
    emoji: "🌅",
    promptFlavor:
      "You're walking a quiet beach at sunset, waves rolling in, warm golden light, a soft breeze. Easy, unhurried — the kind of setting where people actually open up.",
  },
  bookstore_rain: {
    id: "bookstore_rain",
    type: "bookstore",
    location: "old town",
    time: "afternoon",
    weather: "rain",
    ambience: "quiet",
    backgroundSounds: ["rain", "pages", "soft_crowd"],
    visualTheme: "cozy_bookstore",
    emoji: "📚",
    promptFlavor:
      "You're tucked in a little old bookstore while it rains outside, tall shelves, the smell of paper, quiet. You keep half-noticing books as you talk.",
  },
};

export function getScene(id: string): SceneDef | null {
  return SCENES[id] ?? null;
}

export function listScenes(): SceneDef[] {
  return Object.values(SCENES);
}
