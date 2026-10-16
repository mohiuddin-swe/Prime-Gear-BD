export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "Prime Gear BD";

/** Absolute URL for canonicals, sitemap and JSON-LD. Paths keep their trailing slash. */
export const abs = (path: string) => `${SITE_URL}${path}`;

export const productPath = (slug: string) => `/product/${slug}/`;
export const categoryPath = (slug: string) => `/product-category/${slug}/`;
