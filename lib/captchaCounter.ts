// Per-IP "chats since last captcha" counter.
// After CAPTCHA_THRESHOLD chats from the same IP, the next /start requires a
// Turnstile token. Successful verification resets the counter.
// In-memory only; same scaling caveat as sessions.ts (single-instance only).

const globalForCaptcha = globalThis as unknown as {
  __CAPTCHA_BUCKETS__?: Map<string, { chatsSinceVerified: number; lastSeen: number }>;
};
const buckets =
  globalForCaptcha.__CAPTCHA_BUCKETS__ ??
  (globalForCaptcha.__CAPTCHA_BUCKETS__ = new Map());

// User asked: "after 4-5 chats". Threshold of 5 means chats 1-5 pass, 6th demands captcha.
// Configurable via env if needed.
export const CAPTCHA_THRESHOLD = Number(process.env.CAPTCHA_AFTER_N_CHATS) || 5;

// Best-effort cap on bucket count to avoid unbounded growth.
const MAX_BUCKETS = 50_000;

function evictIfNeeded() {
  if (buckets.size <= MAX_BUCKETS) return;
  const sorted = [...buckets.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
  const toDrop = Math.ceil(MAX_BUCKETS * 0.1);
  for (let i = 0; i < toDrop; i++) buckets.delete(sorted[i][0]);
}

// Returns true if the next /start from this IP should be challenged.
export function captchaRequired(ip: string): boolean {
  const b = buckets.get(ip);
  if (!b) return false;
  return b.chatsSinceVerified >= CAPTCHA_THRESHOLD;
}

// Call after a successful /start that did NOT require captcha (or that just verified one).
// Increments the counter so the next batch eventually triggers a challenge.
export function recordChatStart(ip: string) {
  evictIfNeeded();
  const b = buckets.get(ip) || { chatsSinceVerified: 0, lastSeen: Date.now() };
  b.chatsSinceVerified += 1;
  b.lastSeen = Date.now();
  buckets.set(ip, b);
}

// Call after a successful captcha verification — resets the per-IP counter.
export function resetAfterCaptcha(ip: string) {
  buckets.set(ip, { chatsSinceVerified: 0, lastSeen: Date.now() });
}
