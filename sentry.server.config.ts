// Sentry init for the Node.js server runtime (API routes, SSR, instrumentation).
// Loaded from instrumentation.ts register() when NEXT_RUNTIME === "nodejs".
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Only report in production — local/dev noise stays out of the dashboard.
  enabled: process.env.NODE_ENV === "production",
  // Low trace sample rate keeps cost down; errors are always captured.
  tracesSampleRate: 0.1,
  // Anonymous chat — never attach IPs / request bodies / cookies to events.
  sendDefaultPii: false,
});
