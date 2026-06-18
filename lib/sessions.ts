// Redis-backed session store. Sessions live in Redis (keyed `sess:<id>`) so they
// survive a deploy/restart and are shared across multiple Fly machines — fixing
// the "session not found" / dropped-chat problem that the old in-memory Map had
// (every deploy spun up a fresh process with an empty Map).
//
// Access pattern is LOAD-ONCE → MUTATE-LOCAL → SAVE-ONCE:
//   const s = await getSession(id);        // one Redis read, returns a snapshot
//   appendMessage(s, msg);                 // pure, synchronous mutation of `s`
//   endSession(s, "left");                 // ditto
//   await saveSession(s);                  // one Redis write, refreshes TTL
// The granular mutators operate on the Session OBJECT (not an id), so the route's
// local copy and what we persist can never desync. Only create/get/save do I/O.
//
// A sorted-set index (`sessions:idx`, scored by lastActivityAt) tracks non-ended
// sessions so the reaper (lib/reaper.ts) can find abandoned chats cheaply without
// scanning every key.

import { generatePersona, type Persona } from "./persona";
import type { UserPrefs } from "./prefs";
import { type LLMProvider, pickProviderForSession } from "./llmProvider";
import type { ProviderUsage } from "./usage";
import { getRedis } from "./redis";
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

const KEY_PREFIX = "sess:";
const INDEX_KEY = "sessions:idx"; // sorted set: score=lastActivityAt, member=id
const REAPER_LOCK_KEY = "reaper:lock";

// How long an idle session lives in Redis before auto-expiring. Comfortably longer
// than any real chat; every save refreshes it, so active chats never expire. The
// reaper closes abandoned chats (for analytics) well before this fires.
const TTL_SECONDS = Math.max(600, Number(process.env.SESSION_TTL_SECONDS) || 6 * 60 * 60);

function key(id: string): string {
  return KEY_PREFIX + id;
}

// ── I/O (async) ───────────────────────────────────────────────────────────────

export async function createSession(prefs?: UserPrefs): Promise<Session> {
  const now = Date.now();
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
    createdAt: now,
    lastActivityAt: now,
    usage: {},
  };
  await saveSession(session);
  return session;
}

export async function getSession(id: string): Promise<Session | undefined> {
  if (!id) return undefined;
  const raw = await getRedis().get(key(id));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return undefined;
  }
}

// Persist the session and refresh its TTL. Keeps the reaper index in sync:
// non-ended sessions are indexed by lastActivityAt; ended ones are removed.
export async function saveSession(s: Session): Promise<void> {
  const r = getRedis();
  await r.set(key(s.id), JSON.stringify(s), "EX", TTL_SECONDS);
  if (s.ended) {
    await r.zrem(INDEX_KEY, s.id);
  } else {
    await r.zadd(INDEX_KEY, s.lastActivityAt, s.id);
  }
}

// Lightweight liveness bump — refreshes the reaper index score + the key's TTL
// WITHOUT rewriting the session blob. Used by the frequent heartbeat so it can
// keep a chat "alive" for the reaper without risking clobbering a message that a
// concurrent send/idle just appended (last-write-wins on the full blob).
export async function keepAlive(id: string): Promise<void> {
  const r = getRedis();
  await r.zadd(INDEX_KEY, Date.now(), id);
  await r.expire(key(id), TTL_SECONDS);
}

// ── Pure synchronous mutators (operate on the loaded Session object) ────────────
// Call one or more of these, then `await saveSession(s)` to persist.

// Mark a session as "still alive" — call on every user message, idle poll, and
// heartbeat so the reaper only closes genuinely-abandoned chats.
export function touchSession(s: Session): void {
  s.lastActivityAt = Date.now();
}

export function appendMessage(s: Session, msg: ChatMessage): void {
  s.messages.push(msg);
}

export function endSession(s: Session, reason: string): void {
  s.ended = true;
  s.endReason = reason;
}

export function incrementWarning(s: Session): number {
  s.warningCount += 1;
  return s.warningCount;
}

export function incrementSilentPing(s: Session): number {
  s.silentPingCount += 1;
  return s.silentPingCount;
}

export function resetSilentPing(s: Session): void {
  s.silentPingCount = 0;
}

export function getRecentUserMessages(s: Session, limit = 5): string[] {
  return s.messages
    .filter(m => m.role === "user")
    .slice(-limit)
    .map(m => m.content);
}

// ── Reaper support ──────────────────────────────────────────────────────────

// Ids of non-ended sessions whose last activity is older than `idleMs`.
export async function getStaleSessionIds(idleMs: number): Promise<string[]> {
  const cutoff = Date.now() - idleMs;
  return getRedis().zrangebyscore(INDEX_KEY, "-inf", cutoff);
}

// Remove a session id from the reaper index (e.g. after it's reaped/closed).
export async function dropFromIndex(id: string): Promise<void> {
  await getRedis().zrem(INDEX_KEY, id);
}

// Best-effort distributed lock so only ONE machine runs a reaper sweep at a time
// (Fly runs multiple machines; without this they'd double-fire chat_ended). The
// lock auto-expires after `seconds`, so a crashed holder never wedges reaping.
export async function tryReaperLock(seconds: number): Promise<boolean> {
  const res = await getRedis().set(REAPER_LOCK_KEY, "1", "EX", seconds, "NX");
  return res === "OK";
}
