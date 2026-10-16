import { z } from "zod";
import { paginationQuerySchema } from "./api";

export const PRODUCT_SORTS = ["newest", "price_asc", "price_desc", "bestselling"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

const slugSchema = z.string().trim().min(1).max(200);
const takaSchema = z.coerce.number().int().min(0);
// z.coerce.boolean() treats "false" as true, so parse the strings explicitly
const boolQuerySchema = z.enum(["true", "false"]).transform((v) => v === "true");

export const productListQuerySchema = paginationQuerySchema
  .extend({
    category: slugSchema.optional(),
    brand: slugSchema.optional(),
    minPrice: takaSchema.optional(),
    maxPrice: takaSchema.optional(),
    inStock: boolQuerySchema.optional(),
    sort: z.enum(PRODUCT_SORTS).default("newest"),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: "minPrice must not exceed maxPrice",
    path: ["minPrice"],
  });
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const slugParamsSchema = z.object({ slug: slugSchema });

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

// ───────────── Product page content ─────────────
// Stored as JSON on Product. The API re-validates on read, so a bad row renders as empty, not broken.

/** Icons a feature card can use. The web app maps each name to a Lucide icon. */
export const FEATURE_ICONS = [
  "battery",
  "bluetooth",
  "clock",
  "droplet",
  "lightbulb",
  "magnet",
  "moon",
  "palette",
  "plug",
  "remote",
  "rotate",
  "shield",
  "smartphone",
  "sparkles",
  "sun",
  "timer",
  "tool",
  "volume",
  "wifi",
  "zap",
] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];

export const MAX_PRODUCT_FEATURES = 4;

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const productFeatureSchema = z.object({
  icon: z.enum(FEATURE_ICONS),
  title: shortText(40),
  text: shortText(120),
});
export const boxContentSchema = z.object({
  qty: z.number().int().min(1).max(99),
  item: shortText(60),
});
export const lightModeSchema = z.object({
  label: shortText(24),
  /** The light's own colour for the swatch (product data, not a UI token): #rgb or #rrggbb */
  color: z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Use a hex colour like #ffd27a"),
  /** Shown under the swatches while this mode is selected */
  text: shortText(200).optional(),
});
export const productSpecSchema = z.object({
  label: shortText(40),
  value: shortText(120),
});

export const productFeaturesSchema = z.array(productFeatureSchema).max(MAX_PRODUCT_FEATURES);
export const boxContentsSchema = z.array(boxContentSchema).max(30);
export const lightModesSchema = z.array(lightModeSchema).max(6);
export const productSpecsSchema = z.array(productSpecSchema).max(30);

export type ProductFeature = z.infer<typeof productFeatureSchema>;
export type BoxContent = z.infer<typeof boxContentSchema>;
export type LightMode = z.infer<typeof lightModeSchema>;
export type ProductSpec = z.infer<typeof productSpecSchema>;

/**
 * Product page content fields as the admin product form sends them (create and update).
 * Empty string / empty list clears a field. The dark-room shot is uploaded as an image with kind DARK_ROOM.
 */
export const productContentInputSchema = z.object({
  subtitle: z.string().trim().max(120).optional(),
  features: productFeaturesSchema.optional(),
  boxContents: boxContentsSchema.optional(),
  lightModes: lightModesSchema.optional(),
  specs: productSpecsSchema.optional(),
});
export type ProductContentInput = z.infer<typeof productContentInputSchema>;

// ───────────── Response shapes ─────────────

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  isFeatured: boolean;
  /** Lowest active variant price (BDT). */
  price: number;
  /** Original price of the cheapest variant, only when higher than price. */
  comparePrice: number | null;
  inStock: boolean;
  /**
   * The variant a card's quick add puts in the cart: set only when the product has exactly one
   * active variant and it is in stock. Otherwise the card opens the product page to choose.
   */
  quickAddVariantId: string | null;
  imageUrl: string | null;
  category: { name: string; slug: string } | null;
  brand: { name: string; slug: string } | null;
};

export type ProductReview = {
  id: string;
  name: string;
  district: string | null;
  rating: number;
  text: string;
  createdAt: string;
};

export type ProductDetail = ProductCard & {
  subtitle: string | null;
  description: string | null;
  features: ProductFeature[];
  boxContents: BoxContent[];
  /** Empty for products that aren't lights: the light mode selector is hidden */
  lightModes: LightMode[];
  specs: ProductSpec[];
  /** First DARK_ROOM image: enables the "See it lit up" view */
  darkImage: { url: string; alt: string | null } | null;
  /** Published reviews only. average is rounded to one decimal; 0 when count is 0. */
  reviews: {
    average: number;
    count: number;
    /** Every published review is from a verified buyer */
    allVerified: boolean;
    latest: ProductReview[];
  };
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    comparePrice: number | null;
    stock: number;
    isDefault: boolean;
    attributes: { attribute: string; value: string; swatch: string | null }[];
  }[];
  images: {
    id: string;
    url: string;
    alt: string | null;
    kind: "STANDARD" | "DARK_ROOM";
    variantId: string | null;
  }[];
  /** variantId null = applies to the whole product. */
  bulkTiers: {
    id: string;
    variantId: string | null;
    minQty: number;
    unitPrice: number;
    label: string | null;
  }[];
  relatedProducts: ProductCard[];
};

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children: CategoryNode[];
};

export type CategoryDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Root → parent, for BreadcrumbList. */
  ancestors: { name: string; slug: string }[];
  children: { id: string; name: string; slug: string; imageUrl: string | null }[];
};
