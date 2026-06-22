// Random-mode ADAPTER over the shared conversation-state builder
// (shared/brain/state.ts → lib/brain/state.ts). Pulls a callback from the
// session's rolling memory and the flirt flag from prefs, then delegates to the
// shared builder with mode="random". All the ladder/goal/energy logic lives in
// the brain so it stays identical to saved-connections.

import type { UserMemory } from "./sessions";
import type { UserPrefs } from "./prefs";
import type { Persona } from "./persona";
import { buildConversationState } from "./brain/state";

function callbackFrom(memory?: UserMemory): string | null {
  if (!memory) return null;
  return memory.emotional[0] ?? memory.interests[0] ?? memory.identity[0] ?? null;
}

export function directorSection(
  messageCount: number,
  memory?: UserMemory,
  prefs?: UserPrefs,
  lastUserText?: string,
  persona?: Persona,
): string {
  return buildConversationState({
    mode: "random",
    messageCount,
    flirt: prefs?.intent === "love" || prefs?.intent === "flirt",
    lastUserText,
    callback: callbackFrom(memory),
    // Language & Gender Style Engine inputs:
    language: prefs?.language,
    personaGender: persona?.gender,
    userGender: prefs?.gender,
    region: persona?.country,
  });
}
