import * as Sentry from "@sentry/nextjs";

// Next.js calls register() once when the server process boots. We use it to:
//  1. Initialize Sentry for the active server runtime (node or edge).
//  2. Start the abandoned-chat reaper (Node runtime only — not edge/build).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { startReaper } = await import("./lib/reaper");
    startReaper();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in server components, route handlers, and SSR so they
// land in Sentry with request context (Next.js 15 onRequestError hook).
export const onRequestError = Sentry.captureRequestError;
