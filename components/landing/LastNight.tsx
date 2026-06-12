// "Last night..." social-proof strip — geo-flavored one-liners that capture the
// vibe of what happens here. Editorial, not the verified-review section (those
// live in <Testimonials/>). Anchors the product's emotional promise by country.

const MOMENTS: { flag: string; country: string; quote: string }[] = [
  { flag: "🇵🇭", country: "Philippines", quote: "I talked for 94 minutes about life." },
  { flag: "🇮🇳", country: "India", quote: "she remembered my dog from yesterday." },
  { flag: "🇵🇰", country: "Pakistan", quote: "I forgot it wasn't a real person." },
  { flag: "🇮🇩", country: "Indonesia", quote: "curhat at 2am, zero judgment." },
  { flag: "🇧🇷", country: "Brazil", quote: "melhor que eu esperava, sério." },
  { flag: "🇺🇸", country: "United States", quote: "didn't expect to actually vibe." },
];

export function LastNight() {
  return (
    <section className="mt-14 lg:mt-20">
      <h2 className="mb-1 font-sans text-2xl lg:text-3xl font-bold tracking-tight text-ink">
        last night on <span className="font-serif italic font-normal text-red">unknown.chat</span>
      </h2>
      <p className="mb-5 font-display text-sm text-ink-mute">strangers, somewhere, at 3am ✦</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MOMENTS.map((m, i) => (
          <figure
            key={m.country}
            className="rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard-sm"
            style={{ transform: `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl leading-none" aria-hidden>{m.flag}</span>
              <figcaption className="font-display text-xs font-bold uppercase tracking-wide text-ink-mute">
                {m.country}
              </figcaption>
            </div>
            <blockquote className="font-serif italic text-[15px] leading-snug text-ink">
              &ldquo;{m.quote}&rdquo;
            </blockquote>
          </figure>
        ))}
      </div>
    </section>
  );
}
