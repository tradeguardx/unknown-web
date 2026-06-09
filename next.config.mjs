import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the floating "N" dev tools button in dev mode (it's not visible in prod regardless).
  devIndicators: false,
  // Keep geoip-lite out of the server bundle so its bundled .dat data files load
  // from node_modules at runtime (it does fs reads webpack can't trace).
  serverExternalPackages: ["geoip-lite"],
};

export default withSentryConfig(nextConfig, {
  // Org/project for source-map upload (set as build args). Harmless if unset.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only used at build time to upload source maps for readable stack traces.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Skip source-map upload when no auth token is provided — the build still
  // succeeds, you just get minified stack traces until the token is set.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Quiet build logs unless in CI.
  silent: !process.env.CI,
  // NOTE: tunnelRoute ("/monitoring") was tried but 404'd on this deployment
  // even for valid envelopes, which would silently drop client events. The SDK
  // sends directly to ingest.de.sentry.io instead (verified reachable). Tradeoff:
  // ad-blockers can block a minority of client events; reliable delivery for the
  // rest beats risking losing everything through a broken tunnel.
});
