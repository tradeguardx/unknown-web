// Website free-chat gate: anonymous stranger chat is free for ONE conversation
// per day; starting another the same day needs a paid plan or day pass. Enforced
// server-side (a localStorage flag would be trivially bypassed), keyed by the
// persistent visitor id (uc_vid) + UTC date. Paid users (subscription or active
// day pass) are never limited.
//
// Fail-OPEN: if Redis or the visitor id is missing we allow the chat — we never
// want an infra hiccup to block the whole product.

import { getRedis, isRedisConfigured } from "./redis";

const MATCH_API = process.env.NEXT_PUBLIC_MATCH_API_URL || "https://api.unknown.chat/match";
const TTL_SECONDS = 36 * 3600; // cleanup only — the UTC-date key already resets at midnight

function utcDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

async function isPaid(authHeader: string | null): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  try {
    const res = await fetch(`${MATCH_API}/me`, { headers: { Authorization: authHeader } });
    if (!res.ok) return false;
    const j = (await res.json().catch(() => ({}))) as { data?: unknown } & Record<string, unknown>;
    const d = (j.data ?? j) as { subscription?: { active?: boolean }; pass?: { active?: boolean } };
    return !!(d?.subscription?.active || d?.pass?.active);
  } catch {
    return false;
  }
}

// Claim today's free chat. Returns whether the chat may proceed. The FIRST start
// of the UTC day wins the NX lock (free); any later start that day is allowed only
// for paid users.
export async function claimDailyFreeChat(
  vid: string | undefined,
  authHeader: string | null,
): Promise<{ allowed: boolean }> {
  if (!isRedisConfigured() || !vid) return { allowed: true };
  const kv = getRedis();
  const key = `freechat:${vid}:${utcDate()}`;
  // NX set → truthy only if this is the first stranger chat today.
  const first = await kv.set(key, "1", "EX", TTL_SECONDS, "NX").catch(() => "OK");
  if (first) return { allowed: true };
  // Already used the free chat today → paid plan / pass required.
  if (await isPaid(authHeader)) return { allowed: true };
  return { allowed: false };
}
