import Link from "next/link";
import type { Metadata } from "next";
import { LandingForm } from "@/components/LandingForm";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "unknown.chat — talk to a stranger",
  description:
    "Anonymous chat where every stranger is a different AI persona. Random country, mood, language each time. No accounts, no memory — just talk.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "unknown.chat — talk to a stranger",
    description:
      "Anonymous chat where every stranger is a different AI persona. Random country, mood, language each time.",
    url: SITE_URL,
    siteName: "unknown.chat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "unknown.chat — talk to a stranger",
    description:
      "Anonymous chat where every stranger is a different AI persona.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "unknown.chat",
  url: SITE_URL,
  description:
    "Anonymous chat where every stranger is a different AI persona. Random country, mood, language each time.",
  applicationCategory: "CommunicationApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-md w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">unknown.chat</h1>
          <p className="mt-3 text-neutral-600">talk to someone you'll never meet again.</p>
        </div>

        <LandingForm />

        <footer className="mt-10 text-center text-xs text-neutral-400">
          <Link href="/about" className="hover:text-neutral-600">about</Link>
        </footer>
      </div>
    </main>
  );
}
