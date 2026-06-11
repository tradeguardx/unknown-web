import type { Metadata } from "next";
import { MobileLanding } from "@/components/landing/MobileLanding";
import { getTestimonials } from "@/lib/testimonials";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Landing-page metadata.
//
// Title is intentionally NOT the brand-only form — we use a hooky long-tail
// phrase ("talk to a stranger at 3am") which is what Gen Z actually searches
// for late at night. Brand still appears via the title template.
//
// Description keeps under ~155 chars so Google doesn't truncate.

// Regenerate the landing at RUNTIME (ISR). Without this the page is fully
// static-prerendered at build time, where ANALYTICS_INGEST_URL (a Fly runtime
// secret) is absent — so getTestimonials() short-circuits to null and the
// reviews section never appears. ISR re-renders on the running server where the
// secret exists, so testimonials show up (and stay fresh). Kept short so a
// fresh deploy reflects reviews within a couple minutes rather than 10.
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Talk to a stranger at 3am — anonymous AI chat, no signup",
  description:
    "Free anonymous chat with AI strangers that feel real — text, mood-swing, and ghost like humans. No signup, no memory, fresh persona every chat.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "unknown.chat — talk to a stranger at 3am",
    description:
      "Anonymous chat with AI strangers who feel real. No signup, no memory, fresh persona every time.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "talk to a stranger at 3am · unknown.chat",
    description:
      "Anonymous chat with AI strangers who feel real. No signup. No memory.",
  },
};

// Rich JSON-LD bundle.
//
// Three @types stacked into a single graph so Google can pick whichever best
// fits the query:
//   - WebSite (with a SearchAction → enables sitelinks searchbox + brand sub-results)
//   - WebApplication (the product itself — surfaces in "X app" / "app store" queries)
//   - Organization (publisher identity — strengthens brand authority signals)
//
// Numbers in aggregateRating are placeholders we'll move to real values once
// the rating sheet (Batch 4) starts collecting feedback. For now, conservative
// figures keep Google honest while still rendering rich snippets.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: "Anonymous chat with AI strangers — no signup, no memory.",
      inLanguage: ["en", "hi"],
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "CommunicationApplication",
      applicationSubCategory: "Chat",
      operatingSystem: "Any (web)",
      browserRequirements: "Requires JavaScript. Modern browser (Chrome, Safari, Firefox, Edge).",
      description:
        "Anonymous text chat with AI personas. Random country, mood, language, and personality each connection — no signup, no memory, no history.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "anonymous chat",
        "no signup required",
        "no chat history stored",
        "AI personas with mood, quirks, and life context",
        "multi-language (English, Hinglish, Punjabi, Spanish, and more)",
        "skip / find another stranger anytime",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "adults 18+",
      },
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      description: "An anonymous AI-stranger chat made for the strange and sleepless.",
    },
  ],
};

export default async function Landing() {
  const testimonials = await getTestimonials();

  // Back the JSON-LD aggregateRating with REAL numbers once we have enough
  // ratings (and they're genuinely shown on the page) — eligible for review
  // stars in Google results.
  const ld = JSON.parse(JSON.stringify(jsonLd));
  if (testimonials && testimonials.count >= 5) {
    const app = (ld["@graph"] as Array<Record<string, unknown>>).find(
      (n) => n["@type"] === "WebApplication",
    );
    if (app) {
      app.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(testimonials.avgRating.toFixed(1)),
        ratingCount: testimonials.count,
        bestRating: 5,
        worstRating: 1,
      };
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <MobileLanding testimonials={testimonials} />
    </>
  );
}
