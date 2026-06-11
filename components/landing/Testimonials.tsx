// Social-proof section for the landing — real 4-5★ reviews users left after
// their chats. Renders nothing if there aren't any yet (graceful).

import Link from "next/link";
import type { TestimonialsData } from "@/lib/testimonials";

const INTENT_HINT: Record<string, string> = {
  flirt: "flirty chat",
  love: "looking for love",
  vent: "venting",
  friend: "made a friend",
  deep: "deep talk",
  casual: "casual chat",
};

export function Testimonials({ data }: { data: TestimonialsData | null }) {
  // Only show WRITTEN reviews — gated ratings can be star-only (empty text),
  // which would render as broken empty-quote cards.
  const written = (data?.reviews ?? []).filter((r) => r.text && r.text.trim().length > 0);
  if (!data || written.length === 0) return null;
  const shown = written.slice(0, 6);

  return (
    <section className="mt-14 lg:mt-20">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h2 className="font-sans text-2xl lg:text-3xl font-bold tracking-tight text-ink">
          what strangers{" "}
          <span className="font-serif italic font-normal text-red">say</span>
        </h2>
        <div className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-yellow px-3 py-1 -rotate-2 shadow-hard-xs">
          <span className="text-base leading-none">★</span>
          <span className="font-sans text-sm font-bold text-ink">
            {data.avgRating.toFixed(1)}
          </span>
          <span className="font-display text-xs text-ink-soft">· {data.count}+ rated</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r, i) => (
          <figure
            key={i}
            className="rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard-sm"
            style={{ transform: `rotate(${i % 2 === 0 ? -0.6 : 0.6}deg)` }}
          >
            <div className="mb-1.5 text-sm tracking-tight text-red" aria-label={`${r.rating} stars`}>
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

      <div className="mt-5 text-center">
        <Link
          href="/reviews"
          className="inline-block rounded-xl border-2 border-ink bg-paper-cool px-4 py-2 font-sans text-sm font-bold text-ink shadow-hard-xs transition-transform hover:-translate-y-0.5"
        >
          read all reviews →
        </Link>
      </div>
    </section>
  );
}
