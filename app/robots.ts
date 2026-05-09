import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Served at /robots.txt by Next.js's app router.
// Allow crawlers on the public, indexable surface (landing + about).
// Disallow /chat (interactive, no SEO value) and /api/* (internal endpoints).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about"],
        disallow: ["/chat", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
