// Server-side Plausible event reporter.
//
// Plausible's HTTP Events API expects us to forward the original visitor's
// User-Agent and IP (as X-Forwarded-For). Plausible salt-hashes UA+IP daily to
// generate a non-PII visitor ID — so server events get attributed to the same
// visitor as the client's auto-tracked pageviews.
//
// Disabled (no-op) when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is unset, so local dev
// runs without analytics by default.
//
// All calls are fire-and-forget — never await this from a request handler.

import type { Session } from "./sessions";

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_API_HOST = process.env.PLAUSIBLE_API_HOST || "https://plausible.io";

type PropValue = string | number | boolean;

function visitorIp(req: Request): string {
  return (
    req.headers.get("fly-client-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

export async function trackEvent(
  req: Request,
  name: string,
  props?: Record<string, PropValue | undefined>,
): Promise<void> {
  if (!PLAUSIBLE_DOMAIN) return;

  const userAgent = req.headers.get("user-agent") || "";
  const referer = req.headers.get("referer") || `https://${PLAUSIBLE_DOMAIN}/`;

  // Strip undefined/empty values — Plausible's UI treats "" as a real bucket.
  const cleanProps: Record<string, PropValue> = {};
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.length === 0) continue;
      cleanProps[k] = v;
    }
  }

  try {
    await fetch(`${PLAUSIBLE_API_HOST}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        "X-Forwarded-For": visitorIp(req),
      },
      body: JSON.stringify({
        name,
        url: referer,
        domain: PLAUSIBLE_DOMAIN,
        props: Object.keys(cleanProps).length ? cleanProps : undefined,
      }),
    });
  } catch (err) {
    console.warn("[analytics]", err instanceof Error ? err.message : String(err));
  }
}

// Bucket chat duration so Plausible's prop dimensions stay low-cardinality —
// raw seconds would explode the Custom Properties UI into thousands of rows.
function durationBucket(ms: number): string {
  const s = ms / 1000;
  if (s < 30) return "<30s";
  if (s < 120) return "30s-2m";
  if (s < 300) return "2m-5m";
  if (s < 900) return "5m-15m";
  if (s < 1800) return "15m-30m";
  return ">30m";
}

function messageCountBucket(n: number): string {
  if (n === 0) return "0";
  if (n <= 2) return "1-2";
  if (n <= 5) return "3-5";
  if (n <= 10) return "6-10";
  if (n <= 25) return "11-25";
  if (n <= 50) return "26-50";
  if (n <= 100) return "51-100";
  return "100+";
}

export function trackChatStarted(req: Request, session: Session): Promise<void> {
  return trackEvent(req, "chat_started", {
    intent: session.prefs?.intent,
    gender: session.prefs?.gender,
    interested_in: session.prefs?.interestedIn,
    country: session.prefs?.country,
    language: session.prefs?.language,
    provider: session.provider,
  });
}

export function trackChatEnded(req: Request, session: Session, reason: string): Promise<void> {
  const durationMs = Date.now() - session.createdAt;
  return trackEvent(req, "chat_ended", {
    reason,
    duration_bucket: durationBucket(durationMs),
    duration_seconds: Math.round(durationMs / 1000),
    messages_bucket: messageCountBucket(session.messages.length),
    intent: session.prefs?.intent,
    provider: session.provider,
  });
}

export function trackContentFilterWarned(
  req: Request,
  session: Session,
  reason: string,
  warningCount: number,
): Promise<void> {
  return trackEvent(req, "content_filter_warned", {
    reason,
    warning_count: warningCount,
    intent: session.prefs?.intent,
  });
}

export function trackContentFilterClosed(
  req: Request,
  session: Session,
  reason: string,
): Promise<void> {
  return trackEvent(req, "content_filter_closed", {
    reason,
    intent: session.prefs?.intent,
    warning_count: session.warningCount,
  });
}
