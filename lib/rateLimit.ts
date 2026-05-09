// Tiny in-memory per-IP rate limiter. Single-instance only; if you scale to >1
// machine, swap for Redis (same as sessions). For unknown.chat's traffic level
// this is plenty — it's mainly to stop one bad actor from burning your Anthropic credit.
//
// Rolling window: each request appends a timestamp; old timestamps are pruned per call.

const buckets: Map<string, number[]> = (() => {
  // Survive HMR in dev mode (same trick as lib/sessions.ts).
  const g = globalThis as unknown as { __RATE_BUCKETS__?: Map<string, number[]> };
  if (!g.__RATE_BUCKETS__) g.__RATE_BUCKETS__ = new Map();
  return g.__RATE_BUCKETS__;
})();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(
  ip: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const prev = buckets.get(ip) || [];
  const fresh = prev.filter(ts => now - ts < windowMs);

  if (fresh.length >= max) {
    const oldest = fresh[0];
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    buckets.set(ip, fresh);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  fresh.push(now);
  buckets.set(ip, fresh);
  return { ok: true, remaining: max - fresh.length, retryAfterMs: 0 };
}

// Best-effort IP extraction. Behind Fly's proxy, the real client IP is in
// Fly-Client-IP. Behind generic proxies, x-forwarded-for. Falls back to "unknown"
// which means rate-limiting is shared across un-proxied clients (worst case is
// one shared bucket — still better than no limit).
export function clientIp(req: Request): string {
  const flyIp = req.headers.get("fly-client-ip");
  if (flyIp) return flyIp;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
