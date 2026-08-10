import Link from "next/link";

// On-page FAQ for the landing — the highest-ROI SEO block. Puts the target
// phrases ("AI stranger", "anonymous AI chat no signup", "vent to a stranger",
// "3am", "Omegle alternative") into real crawlable on-page text and matches
// long-tail question queries. Rendered server-side; <details> gives an accordion
// UX with zero JS and stays fully crawlable.

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is unknown.chat?",
    a: "unknown.chat lets you chat with an AI stranger anonymously — no signup, no login, no app. Every conversation is a fresh AI persona with its own mood, country, and language. Close the tab and the stranger's gone forever.",
  },
  {
    q: "Is the stranger a real person or an AI?",
    a: "It's an AI. unknown.chat is built around AI personas that text, mood-swing, and ghost like a real person would — we tell you up front it's AI. Other chat sites use AI only as a backup when no humans are online; here the AI stranger is the whole point.",
  },
  {
    q: "Do I need to sign up?",
    a: "No. It's anonymous AI chat with no signup and no email. Tap once and you're talking in about 5 seconds.",
  },
  {
    q: "I can't sleep — can I talk to someone at 3am?",
    a: "Yes. There's always a stranger awake. unknown.chat is made for late-night, when you want to talk to someone but no one's actually around.",
  },
  {
    q: "Can I vent to a stranger anonymously?",
    a: "Yes. A lot of people use unknown.chat to vent or get something off their chest with zero record — no account, no memory, nothing saved.",
  },
  {
    q: "What is the AI date, exactly?",
    a: "A 15–20 minute date with an AI persona you pick, in a scene you pick — voice or text. They flirt, push back, and get bored if you're boring, then score you out of 100 and hand you a shareable report. Same personas as the strangers, just on a date.",
  },
  {
    q: "Is it an Omegle alternative?",
    a: "It's an Omegle alternative with no video and no camera — text only, no signup, and an AI stranger instead of waiting in a queue for a human.",
  },
  {
    q: "Is it free?",
    a: "Yes — free anonymous AI chat. No signup, no paywall to start a conversation.",
  },
];

export function HomeFAQ() {
  // FAQPage schema is low-value for rich results now (Google restricts FAQ
  // snippets to gov/health), but it's cheap and reinforces the entity — the
  // crawlable TEXT above is the real win.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="mt-14 lg:mt-20" aria-labelledby="faq-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2
        id="faq-heading"
        className="font-sans text-2xl lg:text-3xl font-bold tracking-tight text-ink mb-5"
      >
        questions <span className="font-serif italic font-normal text-red">people ask</span>
      </h2>

      <div className="space-y-2.5">
        {FAQS.map((f, i) => (
          <details
            key={i}
            open={i === 0}
            className="group rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-sans text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="shrink-0 text-2xl leading-none text-red">
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">−</span>
              </span>
            </summary>
            <p className="mt-2.5 font-display text-[14px] leading-relaxed text-ink-soft">
              {f.a}
            </p>
            {f.q.includes("AI date") && (
              <Link href="/date" className="mt-2 inline-block font-sans text-[13px] font-bold text-red underline">
                go on one →
              </Link>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
