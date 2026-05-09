import Link from "next/link";
import type { Metadata } from "next";
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
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">← back</Link>
        <h1 className="mt-6 text-3xl font-bold">about unknown.chat</h1>

        <section className="mt-6 space-y-4 text-neutral-700 leading-relaxed">
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
        <p className="mt-2 text-neutral-700">
          Built with Next.js and Anthropic's Claude. The personas you talk to are generated
          per-session with a system prompt and a small bit of pacing logic.
        </p>
      </div>
    </main>
  );
}
