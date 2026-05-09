import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CookieBanner } from "@/components/CookieBanner";

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
      </body>
    </html>
  );
}
