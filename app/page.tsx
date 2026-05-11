import type { Metadata } from "next";
import { LandingForm } from "@/components/LandingForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Logo } from "@/components/Logo";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "unknown.chat — talk to a stranger",
  description:
    "Anonymous chat with strangers who aren't quite real. Different mood, country, and language every time. No accounts, no memory — just talk.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "unknown.chat — talk to a stranger",
    description:
      "Anonymous chat with strangers who aren't quite real. Different mood, country, and language every time.",
    url: SITE_URL,
    siteName: "unknown.chat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "unknown.chat — talk to a stranger",
    description:
      "Anonymous chat with strangers who aren't quite real.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "unknown.chat",
  url: SITE_URL,
  description:
    "Anonymous chat with strangers who aren't quite real. Different mood, country, and language every time.",
  applicationCategory: "CommunicationApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <div className="text-center">
            <h1 className="inline-block">
              <Logo size="lg" />
              <span className="sr-only">unknown.chat</span>
            </h1>
            <p className="mt-3 text-neutral-600">talk to someone you'll never meet again.</p>
          </div>

          <LandingForm />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
