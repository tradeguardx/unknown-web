import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "about",
  description:
    "About unknown.chat — a 'talk to strangers' app where the strangers are AI personas. No accounts, no memory, fresh persona each session.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: "about · unknown.chat",
    description: "How unknown.chat works — AI personas, no memory, no accounts.",
    url: `${SITE_URL}/about`,
  },
};

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">about unknown.chat</h1>

          <section className="mt-6 space-y-4 text-ink-soft leading-relaxed">
            <p>
              unknown.chat is a "talk to strangers" app where the strangers are AI personas.
              Each connection generates a fresh persona — a random country, age, mood, way of
              typing, and quirks — so every chat feels different.
            </p>
            <p>
              We disclose that the strangers are AI here and during onboarding, and we don't
              try to deceive you about that. <em>Inside</em> the chat, however, the persona
              stays in character — that's the point. If you ask "are you a bot?" the persona
              will react like a person would: laugh, deny it, get offended, or ignore you.
            </p>
            <p>
              <strong>No memory across chats.</strong> When you skip or the stranger leaves,
              the persona is gone. We don't keep a profile of you.
            </p>
            <p>
              Be kind, don't share personal info, and don't expect anything you say here to
              mean anything tomorrow.
            </p>
          </section>

          <h2 className="mt-10 text-xl font-semibold">tech</h2>
          <p className="mt-2 text-ink-soft">
            Built with Next.js and Anthropic's Claude. The personas you talk to are generated
            per-session with a system prompt and a small bit of pacing logic.
          </p>

          <h2 className="mt-10 text-xl font-semibold">contact</h2>
          <p className="mt-2 text-ink-soft">
            For privacy questions, abuse reports, DMCA notices, or anything else — reach out
            via the contact details on this page (TBD: replace with your preferred contact
            method, e.g. an email address or a typeform link).
          </p>

          <div className="mt-10 text-sm text-ink-mute">
            See also: <Link href="/faq" className="underline hover:text-ink">faq</Link>{" "}
            · <Link href="/terms" className="underline hover:text-ink">terms of use</Link>{" "}
            · <Link href="/privacy" className="underline hover:text-ink">privacy policy</Link>.
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
