// Client-side helpers for reading/writing user prefs to localStorage.
// Keep this file client-only — never import into server code.

import type { UserPrefs } from "./prefs";

const PREFS_KEY = "unknownchat:prefs:v1";
const ONBOARDING_KEY = "unknownchat:onboarded:v1";

export function loadPrefs(): UserPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as UserPrefs) : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs: UserPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return !!localStorage.getItem(ONBOARDING_KEY);
}

export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, "1");
}
