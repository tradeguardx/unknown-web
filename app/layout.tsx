import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CookieBanner } from "@/components/CookieBanner";

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
        {PLAUSIBLE_SCRIPT_URL && (
          <>
            {/* Plain <script> (not next/script) so the tag renders in the SSR
                HTML directly — Plausible's installation verifier crawls the
                static HTML and doesn't execute JavaScript, so a deferred
                client-injected tag would look like a missing install. */}
            <script defer src={PLAUSIBLE_SCRIPT_URL} />
            {/* Init shim: queues plausible() calls made before the deferred
                script lands, so any custom event we fire from the client
                won't be lost on first paint. */}
            <script
              dangerouslySetInnerHTML={{
                __html: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)};plausible.init=plausible.init||function(i){plausible('init',i)};plausible.init();`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
