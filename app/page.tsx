import type { Metadata } from "next";
import { MobileLanding } from "@/components/landing/MobileLanding";
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MobileLanding />
    </>
  );
}
