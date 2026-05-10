import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CookieBanner } from "@/components/CookieBanner";

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — talk to a stranger`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Anonymous chat where every stranger is a different AI persona. Random country, mood, language each time. No accounts, no memory — just talk.",
  applicationName: SITE_NAME,
  keywords: [
    "talk to strangers",
    "anonymous chat",
    "AI chat",
    "Omegle alternative",
    "random chat",
    "AI personas",
    "stranger chat",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  // Google Search Console domain ownership verification.
  verification: {
    google: "ud2K06XfyLx3ss77EunfuOk6chtTcVPRa3lyfVwYV04",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <CookieBanner />
        {PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
