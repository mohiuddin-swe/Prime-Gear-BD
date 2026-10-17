import type { NextConfig } from "next";

// Extra image hosts (e.g. the Cloudflare R2 public domain), comma separated
const extraHosts = (process.env.IMAGE_HOSTS ?? "").split(",").filter(Boolean);

// Where the Next server reaches the API (server components + the /api/v1 proxy below)
const apiInternalUrl = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");

// Dev only: other hosts allowed to load /_next dev resources (HMR, chunks), e.g. a phone on the
// same WiFi opening http://192.168.0.105:3000. Comma separated hostnames, wildcards allowed (192.168.0.*)
const devOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const config: NextConfig = {
  transpilePackages: ["@primegear/shared", "@primegear/ui"],
  // Keeps the WooCommerce URL patterns: /product/<slug>/ and /product-category/<slug>/
  trailingSlash: true,
  allowedDevOrigins: devOrigins,
  images: {
    remotePatterns: ["placehold.co", ...extraHosts].map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  /**
   * The browser calls the API same-origin at /api/v1/*, proxied here. Cookies (guest cart, admin)
   * are then first-party on whatever host serves the page, and no CORS is involved.
   */
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${apiInternalUrl}/api/v1/:path*` },
      // Images stored by the API's local storage driver (development; production uses the R2 domain)
      { source: "/uploads/:path*", destination: `${apiInternalUrl}/uploads/:path*` },
    ];
  },
};

export default config;
