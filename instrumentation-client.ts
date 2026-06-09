// Sentry init for the browser. Next.js loads this automatically on the client.
// This is where the "frontend errors" actually get captured: uncaught
// exceptions, unhandled promise rejections, and errors surfaced by React error
// boundaries (see app/global-error.tsx).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  // No Session Replay: this is an anonymous chat — we don't record what users
  // type, for privacy. Errors + breadcrumbs are enough to debug.
  sendDefaultPii: false,
});

// Lets Sentry trace client-side route changes (App Router navigations).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
