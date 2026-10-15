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
  imageUrl: string | null;
  category: { name: string; slug: string } | null;
  brand: { name: string; slug: string } | null;
};

export type ProductDetail = ProductCard & {
  description: string | null;
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
