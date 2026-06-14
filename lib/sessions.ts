// In-memory session store. Fine for single-instance dev / small deploys.
// Swap to Redis (or any KV) when you need horizontal scaling or persistence.

import { generatePersona, type Persona } from "./persona";
import type { UserPrefs } from "./prefs";
import { type LLMProvider, pickProviderForSession } from "./llmProvider";
import type { ProviderUsage } from "./usage";
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
  // LLM provider this session committed to at creation. In LLM_PROVIDER=mixed
  // mode this rolls per-session so the chat is coherent (no mid-chat voice
  // shift). In single-provider mode it's just whatever's configured.
  provider: LLMProvider;
  // Number of warn-level content filter hits so far. Second hit promotes to close.
  warningCount: number;
  // Number of consecutive idle pings the persona has sent without the user
  // replying. Resets to 0 whenever the user sends a real message. After 2
  // unanswered pings the persona is forced to leave (no third ping ever) —
  // models impatience the way real strangers behave.
  silentPingCount: number;
  // Once true, no further messages from the persona — they "left".
  ended: boolean;
  endReason?: string;
  // Guard so analytics (chat_ended + summary) fire exactly once per session,
  // even though several code paths can end a chat. Set by lib/chatClose.ts.
  closeRecorded?: boolean;
  createdAt: number;
  // Last sign of life (message / idle poll / heartbeat). The reaper closes chats
  // that go silent past a threshold (user closed the tab without a clean exit).
  lastActivityAt: number;
  // Analytics context snapshotted at creation so the reaper can emit chat_ended
  // + summary without a request object. country = geo at start, vid = visitor id.
  country?: string;
  vid?: string;
  // Token usage accumulated across this session, keyed by provider (chat turns +
  // memory + summary). Used for per-chat cost instrumentation (lib/usage.ts).
  usage: ProviderUsage;
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
    provider: pickProviderForSession(prefs),
    warningCount: 0,
    silentPingCount: 0,
    ended: false,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    usage: {},
  };
  SESSIONS.set(session.id, session);
  return session;
}

// Mark a session as "still alive" — called on every user message, idle poll,
// and heartbeat so the reaper only closes genuinely-abandoned chats.
export function touchSession(id: string): void {
  const s = SESSIONS.get(id);
  if (s) s.lastActivityAt = Date.now();
}

// Snapshot of all live sessions (for the reaper to scan).
export function allSessions(): Session[] {
  return [...SESSIONS.values()];
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

export function incrementWarning(id: string): number {
  const s = SESSIONS.get(id);
  if (!s) return 0;
  s.warningCount += 1;
  return s.warningCount;
}

export function incrementSilentPing(id: string): number {
  const s = SESSIONS.get(id);
  if (!s) return 0;
  s.silentPingCount += 1;
  return s.silentPingCount;
}

export function resetSilentPing(id: string): void {
  const s = SESSIONS.get(id);
  if (!s) return;
  s.silentPingCount = 0;
}

export function getRecentUserMessages(id: string, limit = 5): string[] {
  const s = SESSIONS.get(id);
  if (!s) return [];
  return s.messages
    .filter(m => m.role === "user")
    .slice(-limit)
    .map(m => m.content);
}
