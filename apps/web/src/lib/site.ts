import { normalizeBdPhone } from "@primegear/shared/phone";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "Prime Gear BD";

/** Absolute URL for canonicals, sitemap and JSON-LD. Paths keep their trailing slash. */
export const abs = (path: string) => `${SITE_URL}${path}`;

export const productPath = (slug: string) => `/product/${slug}/`;
export const categoryPath = (slug: string) => `/product-category/${slug}/`;

/** wa.me link for the store's WhatsApp number (NEXT_PUBLIC_WHATSAPP_NUMBER); null when unset or invalid. */
export const whatsappLink = (phone: string | undefined, text?: string) => {
  const local = normalizeBdPhone(phone);
  if (!local) return null;
  return `https://wa.me/88${local}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

export const whatsappHref = whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);

/** Help line on the categories screen. NEXT_PUBLIC_SUPPORT_PHONE overrides the default (01XXXXXXXXX). */
export const SUPPORT_PHONE =
  normalizeBdPhone(process.env.NEXT_PUBLIC_SUPPORT_PHONE) ?? "01567936080";
/** 01567936080 -> 01567-936080 */
export const supportPhoneDisplay = `${SUPPORT_PHONE.slice(0, 5)}-${SUPPORT_PHONE.slice(5)}`;
export const supportWhatsappHref = whatsappHref ?? whatsappLink(SUPPORT_PHONE);

/** The "Our bestselling category" card on the categories screen. Falls back to the first category. */
export const FEATURED_CATEGORY_SLUG = "led-lighting";
