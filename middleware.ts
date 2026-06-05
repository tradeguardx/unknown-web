import { NextResponse, type NextRequest } from "next/server";

// Persistent first-party visitor id. This is what lets analytics tell apart the
// SAME user from a DIFFERENT user across days and networks (new vs returning) —
// the IP+UA hash alone can't, because IPs change and rotate daily.
//
// On the first API request with no `uc_vid` cookie we mint one (random UUID) and
// set it for a year. We also forward it (and a "is this their first ever visit?"
// flag) to the route handler via request headers, so the SAME request that
// creates the cookie still emits an event tagged correctly as a new visitor.
//
// Runs only on /api/* — page documents don't emit events, and scoping it here
// means the very first event (the homepage's pageview beacon) is the request
// that mints the cookie, so it's correctly classified as "new".

const VID_COOKIE = "uc_vid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(VID_COOKIE)?.value;
  const vid = existing || crypto.randomUUID();

  const headers = new Headers(req.headers);
  headers.set("x-uc-vid", vid);
  headers.set("x-uc-vid-new", existing ? "0" : "1");

  const res = NextResponse.next({ request: { headers } });
  if (!existing) {
    res.cookies.set(VID_COOKIE, vid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
