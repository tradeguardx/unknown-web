import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Instrument_Serif, Caveat, Geist_Mono } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CookieBanner } from "@/components/CookieBanner";
import { PageViewTracker } from "@/components/PageViewTracker";

// The four typefaces that anchor the design language. Loaded via next/font so
// Next inlines them as preloaded WOFF2 + scoped CSS variables — no CLS, no
// extra <link> tags. Each is bound to a CSS variable that tailwind.config.ts
// reads (font-sans, font-serif, font-mono, font-display).
const fontSans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const fontSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const fontDisplay = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const fontMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // The site-wide default + template. The landing overrides this with its
    // own (more keyword-rich) title; sub-pages get appended as "X · unknown.chat"
    // — pattern is consistent with Vercel / Linear / brand-led product sites.
    default: `${SITE_NAME} — talk to a stranger, anonymously`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Anonymous chat with AI strangers who text, mood-swing, and ghost like real people. No signup, no memory, fresh persona every time — the 3am chat you've been looking for.",
  applicationName: SITE_NAME,
  // High-intent keyword set targeting:
  //  - the post-Omegle audience (Omegle shut down 2023; people still search for it)
  //  - Gen Z late-night / boredom / lonely queries
  //  - non-English search markets we localize for (Hindi/Hinglish, etc.)
  // Order matters less than Google claims, but more-specific terms first
  // helps for some lesser engines.
  keywords: [
    "talk to strangers",
    "anonymous chat",
    "Omegle alternative",
    "Omegle replacement",
    "Omegle without video",
    "chat with strangers no signup",
    "AI chat with strangers",
    "AI personas chat",
    "random chat",
    "stranger chat",
    "text chat strangers",
    "free chat no login",
    "anonymous text chat",
    "3am chat",
    "late night chat",
    "bored chat app",
    "Hinglish chat",
    "Hindi anonymous chat",
    "AI girlfriend chat free",
    "AI friend chat",
    "chatroulette alternative",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "communication",
  // Be generous with crawler permissions on indexable surfaces. The /chat
  // route is excluded via robots.ts since it has no SEO value.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    // English-speaking + India is the primary audience right now;
    // alternateLocale tells social previews + Google that the same content
    // serves these locales (even though current pages are English-only —
    // we render multi-language inside the chat itself).
    alternateLocale: ["en_GB", "en_IN", "hi_IN"],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@unknownchat",
  },
  // Full favicon set lives in /public. Declared explicitly so the correct <link>
  // tags render (we removed the app/ icon convention files to avoid conflicts).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // manifest references the 192/512 PNGs for PWA / install.
  manifest: "/manifest.webmanifest",
  // Google Search Console domain ownership verification.
  verification: {
    google: "ud2K06XfyLx3ss77EunfuOk6chtTcVPRa3lyfVwYV04",
  },
};

export const viewport: Viewport = {
  // Match the warm paper background so iOS / Android browser chrome blends
  // with the page instead of flashing dark.
  themeColor: "#f5eedb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontDisplay.variable} ${fontMono.variable}`}
    >
      <body>
        {children}
        <PageViewTracker />
        <CookieBanner />
      </body>
    </html>
  );
}
