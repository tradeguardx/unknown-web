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

// Plausible's new per-site tracker URL. The site ID is baked into the JS file
// (no `data-domain` attribute needed). The legacy `/js/script.js` form still
// works but is being sunset — Plausible flags it with a "72 hour upgrade"
// notice in the dashboard. Set NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL to the value
// shown on your Plausible install page (e.g. https://plausible.io/js/pa-XXX.js).
const PLAUSIBLE_SCRIPT_URL = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL;

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
  // Icons come from the app/ file convention now:
  //   app/favicon.ico  → Google Search favicon (raster 16/32/48)
  //   app/icon.svg     → crisp modern-browser favicon
  //   app/apple-icon.png → iOS home-screen icon
  // (manifest references the 192/512 PNGs for PWA / install.)
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
        {PLAUSIBLE_SCRIPT_URL && (
          <>
            {/* Plain <script> (not next/script) so the tag renders in the SSR
                HTML directly — Plausible's installation verifier crawls the
                static HTML and doesn't execute JavaScript, so a deferred
                client-injected tag would look like a missing install.
                Snippet matches Plausible's install page verbatim — their
                verifier looks for the canonical init shim shape. */}
            <script async src={PLAUSIBLE_SCRIPT_URL} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
