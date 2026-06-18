// Shared Redis client for the session store (lib/sessions.ts).
//
// chatApp runs as a long-lived Next server on Fly (runtime = "nodejs"), so we use
// a persistent TCP connection (ioredis) rather than Upstash's REST client — lower
// per-op latency, connection reuse, pipelining. Point REDIS_URL at the Upstash
// `rediss://default:<token>@<host>:6379` connection string (TLS).
//
// If REDIS_URL is unset we fall back to an in-memory emulation of the handful of
// commands sessions.ts uses, so `next dev` and CI keep working with no external
// dependency. The fallback is per-process (NOT shared across machines), so it is
// NOT safe for multi-instance prod — prod MUST set REDIS_URL.

import Redis from "ioredis";

// The subset of the ioredis surface sessions.ts depends on. Both the real client
// and the in-memory shim satisfy this, so callers don't care which is live.
export interface KV {
  get(key: string): Promise<string | null>;
  // set with TTL: set(key, val, "EX", seconds) and the NX lock variant.
  set(key: string, val: string, mode: "EX", seconds: number): Promise<unknown>;
  set(key: string, val: string, mode: "EX", seconds: number, nx: "NX"): Promise<unknown>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrem(key: string, member: string): Promise<number>;
  zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]>;
}

const g = globalThis as unknown as { __REDIS__?: KV };

export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

export function getRedis(): KV {
  if (g.__REDIS__) return g.__REDIS__;
  const url = process.env.REDIS_URL;
  if (url) {
    // ioredis: lazy connect, retry, and TLS is inferred from the rediss:// scheme.
    const client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      // Exponential-ish backoff capped at 2s so a brief blip doesn't wedge requests.
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    client.on("error", (err: Error) => console.warn("[redis] error:", err.message));
    client.on("connect", () => console.log("[redis] connected"));
    g.__REDIS__ = client as unknown as KV;
    return g.__REDIS__;
  }
  console.warn("[redis] REDIS_URL not set — using in-memory fallback (NOT multi-instance safe)");
  g.__REDIS__ = makeMemoryKV();
  return g.__REDIS__;
}

// Minimal in-memory emulation of the commands we use. Single-process only.
function makeMemoryKV(): KV {
  const store = new Map<string, { val: string; expireAt: number }>();
  const zsets = new Map<string, Map<string, number>>();

  const alive = (k: string): boolean => {
    const e = store.get(k);
    if (!e) return false;
    if (e.expireAt && e.expireAt < memoNow()) {
      store.delete(k);
      return false;
    }
    return true;
  };
  // Date.now() is unavailable in some sandboxes (workflow runner); guard it.
  const memoNow = () => (typeof Date.now === "function" ? Date.now() : 0);

  return {
    async get(key) {
      return alive(key) ? store.get(key)!.val : null;
    },
    async set(key: string, val: string, _mode: "EX", seconds: number, nx?: "NX") {
      if (nx === "NX" && alive(key)) return null;
      store.set(key, { val, expireAt: memoNow() + seconds * 1000 });
      return "OK";
    },
    async del(key) {
      return store.delete(key) ? 1 : 0;
    },
    async expire(key, seconds) {
      const e = store.get(key);
      if (!alive(key) || !e) return 0;
      e.expireAt = memoNow() + seconds * 1000;
      return 1;
    },
    async zadd(key, score, member) {
      let z = zsets.get(key);
      if (!z) zsets.set(key, (z = new Map()));
      const existed = z.has(member);
      z.set(member, score);
      return existed ? 0 : 1;
    },
    async zrem(key, member) {
      const z = zsets.get(key);
      return z?.delete(member) ? 1 : 0;
    },
    async zrangebyscore(key, min, max) {
      const z = zsets.get(key);
      if (!z) return [];
      const lo = min === "-inf" ? -Infinity : Number(min);
      const hi = max === "+inf" ? Infinity : Number(max);
      return [...z.entries()]
        .filter(([, s]) => s >= lo && s <= hi)
        .sort((a, b) => a[1] - b[1])
        .map(([m]) => m);
    },
  };
}
