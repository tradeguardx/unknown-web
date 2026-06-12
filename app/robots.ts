import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Served at /robots.txt by Next.js's app router.
// Allow crawlers on every indexable page (landing, FAQ, about, terms, privacy).
// Disallow /chat (interactive, no SEO value) and /api/* (internal endpoints).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/faq", "/about", "/terms", "/privacy", "/reviews", "/id", "/pt"],
        disallow: ["/chat", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
