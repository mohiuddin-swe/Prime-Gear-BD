import type { MetadataRoute } from "next";
import { abs } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/cart/", "/checkout/", "/account/", "/search/", "/styleguide/"],
    },
    sitemap: abs("/sitemap.xml"),
  };
}
