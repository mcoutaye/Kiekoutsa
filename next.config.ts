import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require("./package.json");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSION: version,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "cdn-images.dzcdn.net" },
      { protocol: "https", hostname: "e-cdns-images.dzcdn.net" },
    ],
  },
};

export default nextConfig;
