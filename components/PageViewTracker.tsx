"use client";

// Fires a pageview to /api/analytics/track on first load and on every client-side
// route change. The server enriches it with visitor hash + geo + origin, so all
// we send is the path and (on the first hit) the external referrer.
//
// This is intentionally tiny and dependency-free. It coexists with Plausible's
// auto-pageview tracking; this one feeds our owned DynamoDB pipeline.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function PageViewTracker() {
  const pathname = usePathname();
  // Remember whether we've sent the initial hit, so document.referrer (the
  // external origin) is only attached to the very first pageview of the visit.
  const sentInitial = useRef(false);

  useEffect(() => {
    if (!pathname) return;
    const ref = sentInitial.current ? undefined : document.referrer || undefined;
    sentInitial.current = true;

    // keepalive lets the request survive a fast navigation away from the page.
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pageview", path: pathname, ref }),
      keepalive: true,
    }).catch(() => {
      /* analytics must never break navigation */
    });
  }, [pathname]);

  return null;
}
