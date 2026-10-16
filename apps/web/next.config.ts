import type { NextConfig } from "next";

// Extra image hosts (e.g. the Cloudflare R2 public domain), comma separated
const extraHosts = (process.env.IMAGE_HOSTS ?? "").split(",").filter(Boolean);

const config: NextConfig = {
  transpilePackages: ["@primegear/shared", "@primegear/ui"],
  // Keeps the WooCommerce URL patterns: /product/<slug>/ and /product-category/<slug>/
  trailingSlash: true,
  images: {
    remotePatterns: ["placehold.co", ...extraHosts].map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default config;
