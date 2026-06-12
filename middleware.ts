import { NextResponse, type NextRequest } from "next/server";

// Two jobs:
//  1. Persistent first-party visitor id (uc_vid) — lets analytics tell the SAME
//     user apart across days/networks (new vs returning); IP+UA alone can't.
//  2. Homepage auto-localization — send real users to /id or /pt based on their
//     language/geo (their IG-ad traffic lands on "/" directly, so hreflang alone
//     wouldn't reach them). Bots are exempt so crawling/SEO stays intact.

const VID_COOKIE = "uc_vid";
const LOC_COOKIE = "uc_loc"; // once set, the homepage is never auto-redirected again
// Transient "this is a first-ever visit" marker. The uc_vid cookie is minted on
// the DOCUMENT request, but the pageview event is emitted later by a separate
// beacon (POST /api/analytics/track) — by which time uc_vid already exists, so
// the beacon could never tell new from returning on its own. We carry the signal
// forward in this short-lived marker, and the first pageview beacon consumes it.
const NEW_COOKIE = "uc_new";
const TRACK_PATH = "/api/analytics/track";
const ONE_YEAR = 60 * 60 * 24 * 365;
const THIRTY_MIN = 60 * 30;

// Map a visitor to a localized landing. Accept-Language is the primary signal
// (the language they actually read); geo country is a secondary hint.
const LOCALES = [
  { path: "/id", langs: ["id", "in"], countries: ["ID"] }, // Bahasa Indonesia
  { path: "/pt", langs: ["pt"], countries: ["BR", "PT"] }, // Portuguese (BR)
];

// Don't redirect crawlers — Googlebot must crawl "/", "/id", "/pt" independently
// so hreflang + indexing work. Only real users get auto-localized.
const BOT_RE =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|quora|pinterest|whatsapp|telegrambot|slackbot|discordbot|bingpreview|google-?inspectiontool|chrome-lighthouse/i;

function pickLocale(req: NextRequest): string | null {
  const country = (req.headers.get("cf-ipcountry") || "").trim().toUpperCase();
  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  // First language tag, e.g. "id-ID,id;q=0.9,en;q=0.8" -> "id"
  const primaryLang = accept.split(",")[0]?.split("-")[0]?.trim() || "";

  for (const loc of LOCALES) {
    if (country && loc.countries.includes(country)) return loc.path;
    if (primaryLang && loc.langs.includes(primaryLang)) return loc.path;
  }
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // --- Homepage auto-localization (only "/") --------------------------------
  if (pathname === "/") {
    const ua = req.headers.get("user-agent") || "";
    const alreadyRouted = req.cookies.has(LOC_COOKIE);
    const isBot = BOT_RE.test(ua);
    const forceEn = req.nextUrl.searchParams.has("en"); // ?en pins English

    if (!alreadyRouted && !isBot && !forceEn) {
      const target = pickLocale(req);
      if (target) {
        const url = req.nextUrl.clone();
        url.pathname = target;
        url.search = search; // preserve ?utm_*, etc.
        const res = NextResponse.redirect(url, 302);
        res.cookies.set(LOC_COOKIE, target, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
        return res;
      }
    }
    // English (or pinned / bot): remember the choice so we don't re-evaluate or loop.
    if (!alreadyRouted) {
      const res = withVid(req);
      res.cookies.set(LOC_COOKIE, "en", { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
      return res;
    }
  }

  return withVid(req);
}

function withVid(req: NextRequest): NextResponse {
  const isTrack = req.nextUrl.pathname === TRACK_PATH;
  const existing = req.cookies.get(VID_COOKIE)?.value;
  const hasNewMarker = req.cookies.has(NEW_COOKIE);
  const vid = existing || crypto.randomUUID();

  // First-ever visit if we're minting the id right now, OR the marker set on the
  // initial document load hasn't been consumed by a pageview yet. We can't rely
  // on uc_vid being absent here: the pageview beacon always runs AFTER the id
  // cookie was already set on the document request.
  const isNew = !existing || hasNewMarker;

  const headers = new Headers(req.headers);
  headers.set("x-uc-vid", vid);
  headers.set("x-uc-vid-new", isNew ? "1" : "0");

  const res = NextResponse.next({ request: { headers } });
  const secure = process.env.NODE_ENV === "production";

  if (!existing) {
    res.cookies.set(VID_COOKIE, vid, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
    // Mark the visit as new until the first pageview consumes it. Skip on the
    // beacon itself — there we just report isNew via !existing (no marker needed).
    if (!isTrack) {
      res.cookies.set(NEW_COOKIE, "1", {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: THIRTY_MIN,
      });
    }
  }

  // The first pageview beacon consumes the marker, so later pageviews this visit
  // (and on return days) count as returning.
  if (isTrack && hasNewMarker) {
    res.cookies.delete(NEW_COOKIE);
  }

  return res;
}

export const config = {
  matcher: ["/", "/api/:path*"],
};
