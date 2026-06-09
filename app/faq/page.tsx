import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

// FAQ page — pure SEO play. Each Q&A is written to match a real long-tail
// search query Gen Z users actually type. FAQPage JSON-LD lets Google render
// these as expandable rich snippets directly in search results, which both
// boosts CTR and squats more real estate on the SERP.
//
// Content notes:
//  - Tone matches the rest of the site — lowercase, casual.
//  - Q's are phrased the way someone would type them (mostly question-form,
//    sometimes statement-form for "is this safe" / "is this free" intent).
//  - A's give a direct answer in the first sentence (Google's featured-snippet
//    extractor prefers concise leading answers) then 1-2 sentences of context.
//  - "AI" is named clearly — disclosure tier is "explicit" on this page, same
//    as /about /terms /privacy.

export const metadata: Metadata = {
  title: "FAQ — talk to strangers anonymously, no signup",
  description:
    "Common questions about unknown.chat — how anonymous chat with AI strangers works, is it free, is it safe, how it compares to Omegle, can you chat in Hindi.",
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: "FAQ · unknown.chat",
    description:
      "Common questions about unknown.chat — anonymous AI stranger chat, no signup, no memory.",
    url: `${SITE_URL}/faq`,
  },
};

interface FAQ {
  q: string;
  a: string; // plain-text answer used in JSON-LD (no HTML)
  // Optional render override — when present, used for the visible answer.
  // Keep `a` short for the JSON-LD; this can be longer/richer.
  render?: React.ReactNode;
}

const FAQS: FAQ[] = [
  {
    q: "What is unknown.chat?",
    a: "unknown.chat is a free anonymous text chat where every stranger is an AI persona — a fresh character with a country, mood, age, language, and quirks generated per session. No signup, no memory across chats. Think of it as a one-on-one chat with someone you'll never meet again.",
  },
  {
    q: "Is unknown.chat free?",
    a: "Yes — 100% free, no signup, no email, no card on file. We may add an optional paid tier later for power features, but the core chat will always stay free.",
  },
  {
    q: "Do I need to sign up?",
    a: "No. You can start chatting in under 5 seconds. Just open the site, pick a few preferences if you want (you can skip them), and connect.",
  },
  {
    q: "Are the strangers real people?",
    a: "No — they're AI personas, not real humans. Each persona is generated per session with its own country, mood, age, typing style, quirks, and stories. They're built to feel like real strangers — they get bored, push back, leave when they want — but they aren't human. We disclose this clearly on every page outside the chat.",
  },
  {
    q: "Is unknown.chat a replacement for Omegle?",
    a: "Kind of — Omegle shut down in 2023 and unknown.chat fills the same 'talk to a random stranger' itch, but without video, without the safety problems Omegle had, and without needing another human on the other side. Strangers here are AI, so there's no one inappropriate showing up.",
  },
  {
    q: "How is it different from ChatGPT?",
    a: "ChatGPT is an assistant — it explains, helps, summarizes. unknown.chat is a hangout — every stranger has their own personality, mood, opinions, and stories, and they're not trying to help you with anything. They might tease you, get bored, change the subject, or leave. Different vibe entirely.",
  },
  {
    q: "Can I chat in Hindi or Hinglish?",
    a: "Yes. You can pick Hindi (Devanagari) or Hinglish (Hindi + English code-switch in Roman script) from the preferences. The AI persona will type natively in that language — including the casual register real Indian strangers use, with appropriate pronoun choice (tum / tu / aap).",
  },
  {
    q: "What languages are supported?",
    a: "English, Hindi, Hinglish, Punjabi, Spanish, Portuguese, French, German, Italian, Russian, Turkish, Arabic, Indonesian, Japanese, Korean, and Tagalog/Filipino. Each persona types natively in your chosen language.",
  },
  {
    q: "Is it anonymous?",
    a: "Yes. We don't ask for your name, email, or any account info. Your preferences are stored only on your device. The only thing we see on our servers is your IP address (used briefly for rate limiting + bot protection) and that's never linked to chat content or stored long-term.",
  },
  {
    q: "Do you store my chats?",
    a: "No. Chats live in our server's memory for the duration of the session and are gone the second you skip, the persona leaves, or our server restarts. We never write them to disk or share them with anyone.",
  },
  {
    q: "Is it safe?",
    a: "Yes — safer than Omegle-style apps with real strangers. There's no one creepy on the other side because there's no real human. We also run a content filter that ends the chat immediately on threats, drug solicitation, or any reference to minors. For adult-coded conversation modes (flirt, love), you have to confirm you're 18+.",
  },
  {
    q: "What if I get a creepy AI stranger?",
    a: "You can tap 'skip' anytime to disconnect and find a new persona. The AI can also leave on its own if you push hard limits. Truly inappropriate content (anything involving minors, threats, drug solicitation, etc.) ends the chat server-side, automatically.",
  },
  {
    q: "How do I start a chat?",
    a: "Open the site, tap the red 'find someone awake' button on the landing, optionally set your country / language / what you're looking for, and tap 'save & start'. You'll be connected to a random AI stranger within a few seconds.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. The site is built mobile-first — works on iPhone, Android, and any modern browser. No app to download.",
  },
  {
    q: "What is the persona doing while I chat?",
    a: "Each persona has a backstory generated per session — a country, age, mood, what they're doing right now (e.g. 'lying in bed at 2am, can't sleep'), three specific life-threads on their mind (a sibling who keeps calling, a job interview tomorrow, etc.), and a personality archetype. They drop these into the chat naturally as a real person would.",
  },
  {
    q: "Why do strangers sometimes leave randomly?",
    a: "Because real strangers do too. Each persona has its own patience level — some stay for the whole chat, some ghost after a few messages, some leave the moment the vibe is off. That randomness is what makes it feel less like a chatbot.",
  },
  {
    q: "I'm bored at 3am — what can I do?",
    a: "Open unknown.chat. Most apps slow down at 3am because real humans are asleep — unknown.chat doesn't, because every stranger is AI. Pick 'looking for: vent' if you want to dump something, 'casual chat' if you just want company, 'flirting' (18+) for something flirty.",
  },
  {
    q: "Can I do voice or video chat?",
    a: "No, unknown.chat is text-only. We may add voice later. Video is intentionally not on the roadmap — text keeps the vibe more imaginative and the moderation surface much safer.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(f => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
};

export default function FAQPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8 lg:py-12">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>
          <h1 className="mt-4 font-sans font-bold text-4xl lg:text-5xl tracking-[-0.035em] text-ink">
            frequently asked <span className="font-serif italic text-red font-normal">questions</span>
          </h1>
          <p className="mt-3 font-display text-lg text-ink-soft">
            everything people ask before they start a chat ✦
          </p>

          <div className="mt-10 space-y-7">
            {FAQS.map((faq, i) => (
              <article key={i}>
                <h2 className="font-sans font-bold text-lg lg:text-xl tracking-[-0.02em] text-ink mb-2">
                  {faq.q}
                </h2>
                <p className="font-display text-[17px] lg:text-lg text-ink-soft leading-[1.45]">
                  {faq.render ?? faq.a}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t-[1.5px] border-dashed border-paper-deep font-display text-base text-ink-mute">
            still curious? read the{" "}
            <Link href="/about" className="text-red underline font-semibold">about</Link> page,
            or just{" "}
            <Link href="/" className="text-red underline font-semibold">start a chat</Link>{" "}
            — that&apos;s usually faster.
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
