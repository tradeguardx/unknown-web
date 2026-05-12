import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Instrument_Serif, Caveat, Geist_Mono } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CookieBanner } from "@/components/CookieBanner";

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
    default: `${SITE_NAME} — talk to a stranger`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Anonymous chat with strangers who aren't quite real. Different mood, country, and language every time. No accounts, no memory — just talk.",
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
    <html
      lang="en"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontDisplay.variable} ${fontMono.variable}`}
    >
      <body>
        {children}
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
