// Per-IP captcha gating with three layered rules:
//
//   1. First chat from a fresh IP → captcha. Closes the "5 free chats" hole
//      a bot could exploit by rotating through nothing-state IPs.
//   2. Every CAPTCHA_THRESHOLD chats after the last verified one → captcha.
//      Catches slow-burn abuse from a long-lived IP.
//   3. Random ~CAPTCHA_RANDOM_RATE sample on every other chat → captcha.
//      Catches bots that learn the threshold and stay just under it.
//
// Turnstile in "Managed" mode is mostly invisible for real humans (passive
// background challenge, no UI ~95% of the time) so the friction is small.
// Defaults tuned so a casual user sees roughly one captcha per session.
//
// In-memory only; same scaling caveat as sessions.ts (single-instance only).

const globalForCaptcha = globalThis as unknown as {
  __CAPTCHA_BUCKETS__?: Map<string, { chatsSinceVerified: number; lastSeen: number }>;
};
const buckets =
  globalForCaptcha.__CAPTCHA_BUCKETS__ ??
  (globalForCaptcha.__CAPTCHA_BUCKETS__ = new Map());

export const CAPTCHA_THRESHOLD = Number(process.env.CAPTCHA_AFTER_N_CHATS) || 10;
export const CAPTCHA_RANDOM_RATE = (() => {
  const raw = Number(process.env.CAPTCHA_RANDOM_RATE);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0.03;
  return raw;
})();

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
  // Rule 1: fresh IP → always verify on first chat.
  if (!b) return true;
  // Rule 2: enough chats since the last verify → re-verify.
  if (b.chatsSinceVerified >= CAPTCHA_THRESHOLD) return true;
  // Rule 3: small random sample so the gate isn't fully predictable.
  if (CAPTCHA_RANDOM_RATE > 0 && Math.random() < CAPTCHA_RANDOM_RATE) return true;
  return false;
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
