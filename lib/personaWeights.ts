// Self-tuning persona generation: pulls per-archetype selection weights from the
// analytics service (engagement over a 14-day rolling window) so generatePersona
// can favor the archetypes users actually click with. See GET /persona-weights.
//
// Design notes:
//   - generatePersona is SYNCHRONOUS, so we keep an in-memory cache and refresh it
//     in the BACKGROUND (fire-and-forget). Callers always get the current cache
//     instantly; a stale/empty cache just means "no bias" (weight 1 everywhere).
//   - Safe by default: if the analytics URL/key isn't set or the fetch fails, we
//     return {} → uniform behavior, exactly as before. Never blocks a chat.

type Cache = { weights: Record<string, number>; at: number; fetching: boolean };

const g = globalThis as unknown as { __PERSONA_WEIGHTS__?: Cache };
const cache: Cache = (g.__PERSONA_WEIGHTS__ ??= { weights: {}, at: 0, fetching: false });

const TTL_MS = 60 * 60_000; // refresh hourly
const WINDOW_DAYS = 14;

// Derive the analytics base from the ingest URL (…/analytics/ingest → …/analytics).
function weightsUrl(): string | null {
  const ingest = process.env.ANALYTICS_INGEST_URL;
  if (!ingest) return null;
  const base = ingest.replace(/\/ingest\/?$/, "");
  return `${base}/persona-weights?days=${WINDOW_DAYS}`;
}

async function refresh(): Promise<void> {
  const url = weightsUrl();
  if (!url) return;
  cache.fetching = true;
  try {
    const res = await fetch(url, {
      headers: { "x-ingest-key": process.env.ANALYTICS_INGEST_KEY ?? "" },
    });
    if (!res.ok) throw new Error(`persona-weights ${res.status}`);
    const body = (await res.json()) as { data?: { weights?: Record<string, number> } };
    const w = body.data?.weights;
    if (w && typeof w === "object") {
      cache.weights = w;
      cache.at = Date.now();
    }
  } catch (err) {
    // Stay silent + keep the last good weights (or empty). Never break chat.
    console.warn("[personaWeights] refresh failed:", err instanceof Error ? err.message : String(err));
  } finally {
    cache.fetching = false;
  }
}

// Manual override (testing / emergency tuning): set PERSONA_WEIGHTS_JSON to a JSON
// map like {"soft_hearted":3,"tsundere":2} to force weights without the analytics
// fetch. Lets you watch the bias locally before the analytics endpoint is live.
function overrideWeights(): Record<string, number> | null {
  const raw = process.env.PERSONA_WEIGHTS_JSON;
  if (!raw) return null;
  try {
    const w = JSON.parse(raw);
    return w && typeof w === "object" ? w : null;
  } catch {
    return null;
  }
}

// Per-archetype multiplier (default 1 = no bias). Returns the cached map instantly
// and kicks off a background refresh when stale.
export function getArchetypeWeights(): Record<string, number> {
  const override = overrideWeights();
  if (override) return override;
  if (!cache.fetching && Date.now() - cache.at > TTL_MS) {
    void refresh(); // fire-and-forget; current cache is returned below
  }
  return cache.weights;
}
