import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "refund policy",
  description:
    "unknown plus refund policy — a 7-day money-back guarantee on your first subscription. How to request a refund and what's eligible.",
  alternates: { canonical: `${SITE_URL}/refund` },
  openGraph: {
    title: "refund policy · unknown.chat",
    description: "7-day money-back guarantee on unknown plus subscriptions.",
    url: `${SITE_URL}/refund`,
  },
};

export default function RefundPage() {
  const updated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-ink-mute">
            <Link href="/" className="hover:text-ink">← back</Link>
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">refund policy</h1>
          <p className="mt-2 text-sm text-ink-mute">Last updated: {updated}</p>

          <section className="mt-6 space-y-6 text-ink-soft leading-relaxed">
            <div className="rounded-2xl border-2 border-ink bg-yellow-soft p-4 shadow-hard-sm">
              <p className="font-sans font-bold text-ink">7-day money-back guarantee</p>
              <p className="mt-1 text-[15px]">
                If you&apos;re not happy with an <strong>unknown plus</strong> subscription, you can request a full
                refund within <strong>7 days</strong> of your purchase — no hard questions asked.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-ink">What&apos;s covered</h2>
              <ul className="mt-2 list-disc pl-5 space-y-1.5 text-[15px]">
                <li>Your <strong>first</strong> unknown plus purchase, if you request within 7 days of the charge.</li>
                <li>Refunds are issued in full to your original payment method.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-ink">What&apos;s not covered</h2>
              <ul className="mt-2 list-disc pl-5 space-y-1.5 text-[15px]">
                <li>
                  <strong>Day passes and message top-ups</strong> — these are one-time purchases that
                  unlock access immediately, so they&apos;re <strong>non-refundable</strong>. The 7-day
                  money-back guarantee applies to <strong>subscriptions only</strong>.
                </li>
                <li>Requests made <strong>after 7 days</strong> from the charge date.</li>
                <li>
                  <strong>Renewal</strong> charges after the first period — you can cancel anytime to stop future
                  renewals, but past renewal charges aren&apos;t auto-refunded. Cancel before a renewal to avoid it.
                </li>
                <li>Accounts terminated for abuse or violating our <Link href="/terms" className="underline text-red">terms</Link>.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-ink">How to request a refund</h2>
              <p className="mt-2 text-[15px]">
                Email us within 7 days at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="underline text-red">{SUPPORT_EMAIL}</a>{" "}
                from (or mentioning) the email or account used for the purchase. Tell us you&apos;d like a refund — that&apos;s it.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-ink">Processing time</h2>
              <p className="mt-2 text-[15px]">
                Once approved, refunds are processed within <strong>5–10 business days</strong>. The exact time it
                takes to appear depends on your bank or card provider.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-ink">Cancelling</h2>
              <p className="mt-2 text-[15px]">
                You can cancel unknown plus at any time. After cancelling, you keep access until the end of your
                current billing period, and you won&apos;t be charged again.
              </p>
            </div>

            <p className="text-sm text-ink-mute">
              Note: unknown plus is not live yet. This policy applies to unknown plus subscriptions once they launch.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
