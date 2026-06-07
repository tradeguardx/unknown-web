/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the floating "N" dev tools button in dev mode (it's not visible in prod regardless).
  devIndicators: false,
  // Keep geoip-lite out of the server bundle so its bundled .dat data files load
  // from node_modules at runtime (it does fs reads webpack can't trace).
  serverExternalPackages: ["geoip-lite"],
};

export default nextConfig;
