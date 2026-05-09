// Single source of truth for the canonical site URL — used for metadata
// (canonical, OG, sitemap, robots). Override via NEXT_PUBLIC_SITE_URL env
// var if you ever change domains.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://unknown.chat";

export const SITE_NAME = "unknown.chat";
