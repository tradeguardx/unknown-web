// In-memory session store. Fine for single-instance dev / small deploys.
// Swap to Redis (or any KV) when you need horizontal scaling or persistence.

import { generatePersona, type Persona } from "./persona";
import type { UserPrefs } from "./prefs";
import { nanoid } from "nanoid";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  // Wall-clock time the message was finalized (server-side).
  ts: number;
}

// Structured rolling memory about the user, populated by lib/userMemory.ts.
// Three categories, because what the persona "remembers" matters in different
// ways:
//   - identity: stable facts (name, age, location, work)
//   - interests: hobbies, fandoms, what they like
//   - emotional: mood patterns, vibes, behaviors, how they tend to act —
//                THE most important category for psychological realism.
//                ("gets flirty late", "sarcastic", "stressed about career")
export interface UserMemory {
  identity: string[];
  interests: string[];
  emotional: string[];
}

export const EMPTY_USER_MEMORY: UserMemory = { identity: [], interests: [], emotional: [] };

export interface Session {
  id: string;
  persona: Persona;
  messages: ChatMessage[];
  // Snapshot of user prefs at session start. Stored so /api/chat/send can rebuild
  // the same system prompt the persona was generated against.
  prefs?: UserPrefs;
  // Rolling categorized memory about the user. Survives history trimming —
  // injected into the system prompt so the persona "remembers" emotionally and
  // factually even after old messages roll out of the recent-history window.
  // Internal only — never shown to the user.
  userMemory: UserMemory;
  // Once true, no further messages from the persona — they "left".
  ended: boolean;
  endReason?: string;
  createdAt: number;
}

// Stash the session map on globalThis so Next.js dev-mode hot reloads (which
// re-evaluate this module) don't wipe in-flight sessions. Without this, every
// edit to a route file would orphan every active chat with "session not found".
const globalForSessions = globalThis as unknown as { __SESSIONS__?: Map<string, Session> };
const SESSIONS: Map<string, Session> = globalForSessions.__SESSIONS__ ?? new Map<string, Session>();
if (!globalForSessions.__SESSIONS__) globalForSessions.__SESSIONS__ = SESSIONS;

// Best-effort cap to avoid unbounded growth on a long-running dev server.
const MAX_SESSIONS = 5_000;

function evictIfNeeded() {
  if (SESSIONS.size <= MAX_SESSIONS) return;
  // Drop the oldest 10%.
  const sorted = [...SESSIONS.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  const toDrop = Math.ceil(MAX_SESSIONS * 0.1);
  for (let i = 0; i < toDrop; i++) SESSIONS.delete(sorted[i][0]);
}

export function createSession(prefs?: UserPrefs): Session {
  evictIfNeeded();
  const session: Session = {
    id: nanoid(16),
    persona: generatePersona(prefs),
    prefs,
    messages: [],
    userMemory: { identity: [], interests: [], emotional: [] },
    ended: false,
    createdAt: Date.now(),
  };
  SESSIONS.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return SESSIONS.get(id);
}

export function appendMessage(id: string, msg: ChatMessage): void {
  const s = SESSIONS.get(id);
  if (!s) return;
  s.messages.push(msg);
}

export function endSession(id: string, reason: string): void {
  const s = SESSIONS.get(id);
  if (!s) return;
  s.ended = true;
  s.endReason = reason;
}
