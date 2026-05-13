import type { NextConfig } from "next";
import { execSync } from "child_process";

function getVersion() {
  try {
    const count = execSync("git rev-list --count HEAD").toString().trim();
    return `1.${count.padStart(3, "0")}`;
  } catch {
    return "1.000";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSION: getVersion(),
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
