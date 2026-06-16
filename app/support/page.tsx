import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SupportForm } from "@/components/SupportForm";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "support — unknown.chat" },
  description:
    "Need help with unknown.chat? Leave your email or Instagram and the issue — we usually resolve problems within an hour.",
  alternates: { canonical: `${SITE_URL}/support` },
  openGraph: {
    title: "support — unknown.chat",
    description: "Tell us the issue — we usually fix it within an hour.",
    url: `${SITE_URL}/support`,
  },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>

          <div className="mt-6 text-center">
            <h1 className="font-sans text-3xl lg:text-4xl font-bold tracking-tight">need a hand?</h1>
            <p className="mt-3 font-serif italic text-lg text-ink-soft max-w-md mx-auto">
              tell us what&apos;s wrong and how to reach you — we usually get it sorted within an hour.
            </p>
          </div>

          <div className="mt-8">
            <SupportForm />
          </div>

          <p className="mt-6 text-center font-display text-[13px] text-ink-mute">
            prefer email? write to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline text-red font-semibold">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="mt-2 text-center font-display text-[12px] text-ink-mute">
            billing question? see our{" "}
            <Link href="/refund" className="underline text-red">refund policy</Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
