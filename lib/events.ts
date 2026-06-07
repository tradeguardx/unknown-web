// Custom analytics event pipeline — PRODUCER side.
//
// Fire-and-forget emitter that POSTs typed events to the analytics service's
// HTTP ingest endpoint; an ingest Lambda there publishes them to SQS, which a
// consumer drains into DynamoDB (see ../../analytics-service). The app needs NO
// AWS credentials — just the ingest URL + a shared key.
//
// This runs ALONGSIDE Plausible (lib/analytics.ts): Plausible gives quick web
// stats, this gives rich, owned, queryable analytics + chat summaries.
//
// Everything here is best-effort and non-blocking. If ANALYTICS_INGEST_URL is
// unset (local dev) every emit is a silent no-op, and failures are swallowed
// with a warning. NEVER await these on a request's critical path — always
// `void emit...(...)`.

import { createHash } from "crypto";
import { nanoid } from "nanoid";
import geoip from "geoip-lite";
import type { Session } from "./sessions";

const INGEST_URL = process.env.ANALYTICS_INGEST_URL;
const INGEST_KEY = process.env.ANALYTICS_INGEST_KEY;
// Presence endpoint sits next to /ingest on the same service.
const PRESENCE_URL = INGEST_URL
  ? INGEST_URL.replace(/\/ingest\/?$/, "/presence")
  : undefined;
// Salt for the daily visitor hash. Set to a private value in prod so the hash
// can't be reversed by brute-forcing IP+UA. Rotating it daily (built in below)
// makes the visitor id non-persistent across days — same privacy stance as
// Plausible's salt-per-day model.
const VISITOR_SALT = process.env.ANALYTICS_VISITOR_SALT || "unknown-chat";

export function isAnalyticsEnabled(): boolean {
  return !!INGEST_URL;
}

// ---------------------------------------------------------------------------
// Event contract (kept in sync with analytics-service/src/events/types.ts)
// ---------------------------------------------------------------------------

export type AnalyticsEventType =
  | "pageview"
  | "chat_started"
  | "chat_ended"
  | "chat_summary"
  | "content_filter"
  | "feedback"
  | "chat_transcript";

type PropValue = string | number | boolean;

export interface AnalyticsEnvelope {
  // Stable per-event id. Used by the consumer for at-least-once dedup, so it
  // MUST be unique per logical event (not regenerated on retry).
  id: string;
  type: AnalyticsEventType;
  ts: number; // epoch ms
  date: string; // YYYY-MM-DD (UTC) — the partition key suffix the consumer uses
  sessionId?: string;
  // Persistent first-party visitor id (uc_vid cookie). Stable across days /
  // networks — THE user identity, used for unique-visitor and new/returning.
  vid?: string;
  // True if this is the visitor's first-ever visit (cookie was just minted).
  isNew?: boolean;
  // Daily-salted hash of the IP only — counts distinct networks/IPs per day.
  ipHash?: string;
  country?: string; // ISO-2, from an upstream geo header (see countryFrom)
  origin?: string; // "direct" | "internal" | referrer hostname
  ref?: string; // raw referrer (external only)
  ua?: string;
  path?: string; // page path, for pageview
  props?: Record<string, PropValue>;
}

// ---------------------------------------------------------------------------
// Request-derived helpers
// ---------------------------------------------------------------------------

// The analytics "day" is IST (UTC+5:30, no DST) — so daily buckets, the date
// picker, and unique-per-day dedup all align to an India-local calendar day.
// Event timestamps (ts) stay absolute epoch-ms; only the date key is localized.
const ANALYTICS_TZ_OFFSET_MIN = 330;

export function utcDate(ts: number = Date.now()): string {
  return new Date(ts + ANALYTICS_TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

function visitorIp(req: Request): string {
  return (
    req.headers.get("fly-client-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

// Persistent visitor id, injected by middleware.ts from the uc_vid cookie.
export function visitorVid(req: Request): string | undefined {
  return req.headers.get("x-uc-vid") || undefined;
}

// Whether middleware just minted the cookie → first-ever visit.
export function visitorIsNew(req: Request): boolean {
  return req.headers.get("x-uc-vid-new") === "1";
}

// Daily-rotating, salted, one-way hash of the IP only. Counts distinct
// networks/IPs per day without ever storing an IP. Comparing this against the
// unique-visitor (cookie) count reveals NAT / shared-IP vs multi-IP users.
export function ipHashDaily(req: Request): string {
  return createHash("sha256")
    .update(`${VISITOR_SALT}|ip|${utcDate()}|${visitorIp(req)}`)
    .digest("hex")
    .slice(0, 24);
}

// Best-effort visitor country (ISO-2). First an upstream geo header (Cloudflare
// cf-ipcountry / Vercel), then a local GeoIP lookup on the IP — so it works on
// Fly even with no edge geo header. We derive country only; the IP isn't stored.
// IP geolocation by GeoLite2 data created by MaxMind (https://www.maxmind.com).
export function countryFrom(req: Request): string | undefined {
  const c = (
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("x-geo-country") ||
    ""
  )
    .trim()
    .toUpperCase();
  // Cloudflare emits XX/T1 for unknown / Tor — treat as no-country.
  if (c && c !== "XX" && c !== "T1") return c;

  // Fallback: local GeoIP lookup (no external call, no IP stored).
  try {
    const ip = visitorIp(req);
    if (ip) {
      const geo = geoip.lookup(ip);
      if (geo?.country) return geo.country.toUpperCase();
    }
  } catch {
    /* geoip unavailable → no country */
  }
  return undefined;
}

// Coarse device class from the User-Agent — enough to compare mobile vs desktop
// UX without a UA-parsing dependency.
export function deviceFrom(req: Request): "mobile" | "tablet" | "desktop" {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))|kindle|silk|playbook/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|phone|blackberry|opera mini|iemobile/.test(ua)) return "mobile";
  return "desktop";
}

// Classify a referrer into a low-cardinality origin label plus the raw ref
// (kept only for external referrers, for the dashboard's "top sources" view).
export function originFrom(
  ref: string | null | undefined,
  req: Request,
): { origin: string; ref?: string } {
  if (!ref) return { origin: "direct" };
  try {
    const u = new URL(ref);
    const selfHost = (req.headers.get("host") || "").toLowerCase();
    if (u.host.toLowerCase() === selfHost) return { origin: "internal" };
    return { origin: u.hostname.replace(/^www\./, ""), ref };
  } catch {
    return { origin: "direct" };
  }
}

// ---------------------------------------------------------------------------
// Core emit
// ---------------------------------------------------------------------------

export async function emitEvent(
  partial: Omit<AnalyticsEnvelope, "id" | "ts" | "date"> &
    Partial<Pick<AnalyticsEnvelope, "id" | "ts" | "date">>,
): Promise<void> {
  if (!INGEST_URL) return;

  const ts = partial.ts ?? Date.now();
  const cleanProps: Record<string, PropValue> = {};
  if (partial.props) {
    for (const [k, v] of Object.entries(partial.props)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.length === 0) continue;
      cleanProps[k] = v;
    }
  }

  const event: AnalyticsEnvelope = {
    ...partial,
    id: partial.id ?? nanoid(21),
    ts,
    date: partial.date ?? utcDate(ts),
    props: Object.keys(cleanProps).length ? cleanProps : undefined,
  };

  try {
    await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(INGEST_KEY ? { "x-ingest-key": INGEST_KEY } : {}),
      },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.warn(
      "[events] ingest failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ---------------------------------------------------------------------------
// Typed emit helpers — one per event the app produces
// ---------------------------------------------------------------------------

export function emitPageview(
  req: Request,
  path: string,
  ref?: string | null,
): Promise<void> {
  const { origin, ref: keptRef } = originFrom(ref, req);
  return emitEvent({
    type: "pageview",
    path,
    vid: visitorVid(req),
    isNew: visitorIsNew(req),
    ipHash: ipHashDaily(req),
    country: countryFrom(req),
    origin,
    ref: keptRef,
    ua: req.headers.get("user-agent") || undefined,
    props: { device: deviceFrom(req) },
  });
}

export function emitChatStarted(req: Request, session: Session): Promise<void> {
  return emitEvent({
    type: "chat_started",
    sessionId: session.id,
    vid: visitorVid(req),
    country: countryFrom(req),
    props: {
      intent: session.prefs?.intent ?? "unset",
      gender: session.prefs?.gender ?? "unset",
      interested_in: session.prefs?.interestedIn ?? "unset",
      pref_country: session.prefs?.country ?? "unset",
      language: session.prefs?.language ?? "unset",
      provider: session.provider,
    },
  });
}

export function emitChatEnded(
  req: Request,
  session: Session,
  reason: string,
): Promise<void> {
  const durationMs = Math.max(0, Date.now() - session.createdAt);
  return emitEvent({
    type: "chat_ended",
    sessionId: session.id,
    vid: visitorVid(req),
    country: countryFrom(req),
    props: {
      reason,
      duration_ms: durationMs,
      message_count: session.messages.length,
      intent: session.prefs?.intent ?? "unset",
      provider: session.provider,
    },
  });
}

export function emitChatSummary(
  req: Request,
  session: Session,
  insight: import("./chatSummary").ChatInsight,
  reason: string,
): Promise<void> {
  const durationMs = Math.max(0, Date.now() - session.createdAt);
  return emitEvent({
    type: "chat_summary",
    sessionId: session.id,
    country: countryFrom(req),
    props: {
      summary: insight.summary,
      // Structured persona-improvement signals.
      engagement: insight.engagement,
      user_sentiment: insight.userSentiment,
      persona_realism: insight.personaRealism,
      end_trigger: insight.endTrigger,
      topics: insight.topics.join(","),
      improvement: insight.improvement,
      end_reason: reason,
      duration_ms: durationMs,
      message_count: session.messages.length,
      // Filter / prefs snapshot — what the user picked before chatting.
      intent: session.prefs?.intent ?? "unset",
      gender: session.prefs?.gender ?? "unset",
      interested_in: session.prefs?.interestedIn ?? "unset",
      language: session.prefs?.language ?? "unset",
      pref_country: session.prefs?.country ?? "unset",
      provider: session.provider,
      // Persona snapshot — useful for spotting which persona shapes go well/badly.
      persona_country: session.persona.country,
      persona_age: session.persona.age,
      persona_gender: session.persona.gender,
      persona_mood: session.persona.mood,
      persona_archetype: session.persona.archetype,
      persona_typing_style: session.persona.typingStyle,
    },
  });
}

// Live presence heartbeat for an active chat. Fire-and-forget, server-side, so
// the persistent visitor id + ingest key never touch the browser. Drives the
// dashboard's "people chatting now" count.
export async function sendPresence(req: Request, sessionId: string): Promise<void> {
  if (!PRESENCE_URL) return;
  try {
    await fetch(PRESENCE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(INGEST_KEY ? { "x-ingest-key": INGEST_KEY } : {}),
      },
      body: JSON.stringify({ sessionId, vid: visitorVid(req) }),
    });
  } catch {
    /* presence is best-effort */
  }
}

// User feedback — emoji rating (1-5) + optional written review. `kind` is
// "chat_rating" (after a chat) or "app_review" (general). Session is optional;
// when present we attach context so we can see which chats/personas get rated.
export function emitFeedback(
  req: Request,
  session: Session | undefined,
  data: { kind: "chat_rating" | "app_review"; rating: number; text?: string },
): Promise<void> {
  const props: Record<string, string | number | boolean> = {
    kind: data.kind,
    rating: data.rating,
  };
  if (data.text) props.text = data.text;
  if (session) {
    props.session_id = session.id;
    props.duration_ms = Math.max(0, Date.now() - session.createdAt);
    props.message_count = session.messages.length;
    props.intent = session.prefs?.intent ?? "unset";
    props.language = session.prefs?.language ?? "unset";
    props.persona_country = session.persona.country;
    props.persona_archetype = session.persona.archetype;
    props.persona_mood = session.persona.mood;
  }
  return emitEvent({
    type: "feedback",
    sessionId: session?.id,
    vid: visitorVid(req),
    country: countryFrom(req),
    props,
  });
}

// Light PII redaction before any transcript leaves the app.
function redact(s: string): string {
  return s
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]")
    .replace(/\b\+?\d[\d\s().-]{7,}\d\b/g, "[number]");
}

// Sampled raw transcript — stored for only a small % of chats (the caller
// decides whether to sample), redacted + capped, with a short TTL on the
// service side. For QA: understanding how real conversations actually go.
export function emitTranscript(req: Request, session: Session, reason: string): Promise<void> {
  // Compact + cap: last 80 turns, each ≤1000 chars, to stay well under limits.
  const messages = session.messages.slice(-80).map((m) => ({
    r: m.role === "user" ? "u" : "a",
    t: redact(m.content).slice(0, 1000),
  }));
  return emitEvent({
    type: "chat_transcript",
    sessionId: session.id,
    country: countryFrom(req),
    props: {
      transcript: JSON.stringify(messages),
      message_count: session.messages.length,
      end_reason: reason,
      duration_ms: Math.max(0, Date.now() - session.createdAt),
      intent: session.prefs?.intent ?? "unset",
      language: session.prefs?.language ?? "unset",
      persona_country: session.persona.country,
      persona_age: session.persona.age,
      persona_gender: session.persona.gender,
      persona_archetype: session.persona.archetype,
    },
  });
}

export function emitContentFilter(
  req: Request,
  session: Session,
  action: "warn" | "close",
  reason: string,
  warningCount: number,
): Promise<void> {
  return emitEvent({
    type: "content_filter",
    sessionId: session.id,
    country: countryFrom(req),
    props: {
      action,
      reason,
      warning_count: warningCount,
      intent: session.prefs?.intent ?? "unset",
    },
  });
}
