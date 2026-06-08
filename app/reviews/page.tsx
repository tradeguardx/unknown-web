import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getAllReviews } from "@/lib/testimonials";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "reviews — what people say about unknown.chat",
  description:
    "Real reviews from people who chatted on unknown.chat — the anonymous AI-stranger chat. See why they keep coming back.",
  alternates: { canonical: `${SITE_URL}/reviews` },
  openGraph: {
    title: "reviews · unknown.chat",
    description: "Real reviews from people who chatted on unknown.chat.",
    url: `${SITE_URL}/reviews`,
  },
};

const INTENT_HINT: Record<string, string> = {
  flirt: "flirty chat",
  love: "looking for love",
  vent: "venting",
  friend: "made a friend",
  deep: "deep talk",
  casual: "casual chat",
};

export default async function ReviewsPage() {
  const data = await getAllReviews();
  const reviews = data?.reviews ?? [];
  const avg = data?.avgRating ?? 0;
  const count = data?.count ?? 0;

  // Review + AggregateRating JSON-LD (eligible for star ratings in Google).
  const jsonLd =
    count >= 5
      ? {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          applicationCategory: "CommunicationApplication",
          operatingSystem: "Any (web)",
          url: SITE_URL,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avg,
            reviewCount: count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 30).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: "A stranger" },
            reviewBody: r.text,
            ...(r.ts ? { datePublished: new Date(r.ts).toISOString().slice(0, 10) } : {}),
          })),
        }
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              what strangers <span className="font-serif italic font-normal text-red">say</span>
            </h1>
            {count >= 5 && (
              <div className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-yellow px-3 py-1 -rotate-2 shadow-hard-xs">
                <span className="text-base leading-none">★</span>
                <span className="font-sans text-sm font-bold text-ink">{avg.toFixed(1)}</span>
                <span className="font-display text-xs text-ink-soft">· {count}+ rated</span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="mt-10 text-center font-display text-ink-mute">
              no reviews yet — be the first to leave one after a chat.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {reviews.map((r, i) => (
                <figure
                  key={r.id ?? i}
                  className="rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard-sm"
                  style={{ transform: `rotate(${i % 2 === 0 ? -0.4 : 0.4}deg)` }}
                >
                  <div className="mb-1.5 text-sm tracking-tight text-red">
                    {"★".repeat(r.rating)}
                    <span className="text-ink-faint">{"★".repeat(5 - r.rating)}</span>
                  </div>
                  <blockquote className="font-mono text-[13px] leading-relaxed text-ink">
                    “{r.text}”
                  </blockquote>
                  <figcaption className="mt-2 font-display text-xs text-ink-mute">
                    — a stranger
                    {r.country ? ` from ${r.country}` : ""}
                    {INTENT_HINT[r.intent] ? ` · ${INTENT_HINT[r.intent]}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/chat"
              className="inline-block rounded-xl border-2 border-ink bg-red text-paper-cool px-5 py-2.5 font-sans font-bold tracking-tight shadow-hard"
            >
              start chatting →
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
