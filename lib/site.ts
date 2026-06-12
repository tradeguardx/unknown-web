// Single source of truth for the canonical site URL — used for metadata
// (canonical, OG, sitemap, robots). Override via NEXT_PUBLIC_SITE_URL env
// var if you ever change domains.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://unknown.chat";

export const SITE_NAME = "unknown.chat";

// Support / contact email — the single way people reach us (refunds, privacy,
// abuse, DMCA, general questions). Used everywhere we surface contact info.
export const SUPPORT_EMAIL = "support@unknown.chat";

// Social profiles we invite people to follow. Add Twitter/X here later and it
// shows up everywhere <SocialFollow /> is rendered — no other change needed.
// Set `url` to "" to hide a platform without deleting the entry.
export const SOCIALS: { name: string; handle: string; url: string }[] = [
  {
    name: "Instagram",
    handle: "@unknown__chat__",
    url: "https://www.instagram.com/unknown__chat__/",
  },
  // { name: "Twitter", handle: "@unknownchat", url: "" }, // coming soon
];
