import { z } from "zod";
import { paginationQuerySchema } from "./api";
import { productContentInputSchema } from "./catalog";

// Admin catalog: products, variants, images, bulk tiers, upsell rules, categories and brands.
// Every write endpoint validates its body with one of these; the admin forms use the same types.

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const IMAGE_KINDS = ["STANDARD", "DARK_ROOM"] as const;
export const UPSELL_TYPES = ["BUY_TOGETHER", "CART_UPSELL", "CHECKOUT_UPSELL", "POST_ORDER"] as const;
export const DISCOUNT_TYPES = ["FIXED", "PERCENT"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ImageKind = (typeof IMAGE_KINDS)[number];
export type UpsellType = (typeof UPSELL_TYPES)[number];
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/** Catalog writes are for OWNER and MANAGER; call agents and packers never edit the catalog. */
export const CATALOG_ADMIN_ROLES = ["OWNER", "MANAGER"] as const;

const id = z.string().trim().min(1).max(64);
const taka = z.number().int().min(0).max(10_000_000);
// Empty string from a cleared form field is stored as null
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
export const slugInputSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");

export const idParamsSchema = z.object({ id });
export const productImageParamsSchema = z.object({ id, imageId: id });

// ───────────── Products ─────────────

export const adminProductListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

export const variantAttributeInputSchema = z.object({
  attribute: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(60),
});

export const variantInputSchema = z
  .object({
    /** Existing variant id; omit for a new one */
    id: id.optional(),
    name: z.string().trim().min(1).max(120),
    sku: z.string().trim().min(1).max(64),
    price: taka,
    comparePrice: taka.nullish().transform((v) => v ?? null),
    stock: z.number().int().min(0).max(1_000_000),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
    attributes: z.array(variantAttributeInputSchema).max(5).default([]),
  })
  .refine((v) => v.comparePrice === null || v.comparePrice > v.price, {
    message: "Compare price must be higher than the price",
    path: ["comparePrice"],
  });
export type VariantInput = z.input<typeof variantInputSchema>;

export const bulkTierInputSchema = z.object({
  /** Index into the form's variants array, null = whole product (ids don't exist yet for new variants) */
  variantIndex: z.number().int().min(0).nullable().default(null),
  minQty: z.number().int().min(2).max(1000),
  unitPrice: taka.refine((v) => v > 0, "Enter a price"),
  label: optionalText(40),
});
export type AdminBulkTierInput = z.input<typeof bulkTierInputSchema>;

export const productInputSchema = productContentInputSchema
  .extend({
    name: z.string().trim().min(1).max(200),
    slug: slugInputSchema,
    status: z.enum(PRODUCT_STATUSES),
    categoryId: id.nullish().transform((v) => v ?? null),
    brandId: id.nullish().transform((v) => v ?? null),
    shortDescription: optionalText(500),
    description: optionalText(20_000),
    isFeatured: z.boolean().default(false),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    seoTitle: optionalText(70),
    seoDescription: optionalText(160),
    variants: z.array(variantInputSchema).min(1, "Add at least one variant").max(100),
    bulkTiers: z.array(bulkTierInputSchema).max(10).default([]),
  })
  .superRefine((p, ctx) => {
    const skus = new Set<string>();
    p.variants.forEach((v, i) => {
      const key = v.sku.toLowerCase();
      if (skus.has(key)) {
        ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "SKU is used twice" });
      }
      skus.add(key);
    });
    if (p.variants.filter((v) => v.isDefault).length > 1) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Only one default variant" });
    }
    const tiers = new Set<string>();
    p.bulkTiers.forEach((t, i) => {
      if (t.variantIndex !== null && t.variantIndex >= p.variants.length) {
        ctx.addIssue({
          code: "custom",
          path: ["bulkTiers", i, "variantIndex"],
          message: "Unknown variant",
        });
      }
      const key = `${t.variantIndex}:${t.minQty}`;
      if (tiers.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["bulkTiers", i, "minQty"],
          message: "Two tiers have the same quantity",
        });
      }
      tiers.add(key);
    });
  });
export type ProductInput = z.input<typeof productInputSchema>;
export type ProductInputParsed = z.output<typeof productInputSchema>;

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  imageUrl: string | null;
  category: string | null;
  brand: string | null;
  /** Lowest active variant price */
  price: number;
  stock: number;
  variantCount: number;
  updatedAt: string;
};

export type AdminProductImage = {
  id: string;
  url: string;
  alt: string | null;
  kind: ImageKind;
  variantId: string | null;
  sortOrder: number;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  categoryId: string | null;
  brandId: string | null;
  subtitle: string | null;
  shortDescription: string | null;
  description: string | null;
  isFeatured: boolean;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  features: z.infer<typeof productContentInputSchema>["features"];
  boxContents: z.infer<typeof productContentInputSchema>["boxContents"];
  lightModes: z.infer<typeof productContentInputSchema>["lightModes"];
  specs: z.infer<typeof productContentInputSchema>["specs"];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    comparePrice: number | null;
    stock: number;
    isDefault: boolean;
    isActive: boolean;
    attributes: { attribute: string; value: string }[];
  }[];
  bulkTiers: {
    id: string;
    variantId: string | null;
    minQty: number;
    unitPrice: number;
    label: string | null;
  }[];
  images: AdminProductImage[];
  updatedAt: string;
};

// ───────────── Images and uploads ─────────────

export const UPLOAD_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];
export const UPLOAD_FOLDERS = ["products", "categories", "brands"] as const;
/** 8 MB: phone photos fit, and it stays under the Next.js proxy's request body limit */
export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export const presignUploadSchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS),
  contentType: z.enum(UPLOAD_CONTENT_TYPES),
  size: z
    .number()
    .int()
    .min(1)
    .max(UPLOAD_MAX_BYTES, `Images must be ${UPLOAD_MAX_BYTES / 1024 / 1024} MB or smaller`),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

/** Where and how the browser uploads the file: PUT `url` with exactly these headers. */
export type PresignedUpload = {
  key: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  /** Where the file is served once uploaded */
  publicUrl: string;
  expiresAt: string;
};

export const addProductImageSchema = z.object({
  key: z.string().trim().min(1).max(300),
  alt: optionalText(200),
  kind: z.enum(IMAGE_KINDS).default("STANDARD"),
});
export type AddProductImageInput = z.input<typeof addProductImageSchema>;

export const updateProductImageSchema = z.object({
  alt: optionalText(200).optional(),
  kind: z.enum(IMAGE_KINDS).optional(),
  variantId: id.nullish(),
});
export type UpdateProductImageInput = z.input<typeof updateProductImageSchema>;

export const reorderImagesSchema = z.object({
  ids: z.array(id).min(1).max(100),
});

// ───────────── Upsell rules ─────────────

export const upsellRuleListQuerySchema = z.object({
  triggerProductId: id.optional(),
});

export const upsellRuleInputSchema = z
  .object({
    type: z.enum(UPSELL_TYPES),
    name: z.string().trim().min(1).max(120),
    triggerProductId: id.nullish().transform((v) => v ?? null),
    triggerCategoryId: id.nullish().transform((v) => v ?? null),
    offerProductId: id,
    discountType: z.enum(DISCOUNT_TYPES).default("FIXED"),
    discountValue: z.number().int().min(0).max(1_000_000).default(0),
    priority: z.number().int().min(0).max(1000).default(0),
    isActive: z.boolean().default(true),
  })
  .refine((r) => Boolean(r.triggerProductId) !== Boolean(r.triggerCategoryId), {
    message: "Choose a trigger product or a trigger category",
    path: ["triggerProductId"],
  })
  .refine((r) => r.discountType !== "PERCENT" || r.discountValue <= 100, {
    message: "A percent discount is 0-100",
    path: ["discountValue"],
  })
  .refine((r) => r.triggerProductId !== r.offerProductId, {
    message: "A product can't be offered with itself",
    path: ["offerProductId"],
  });
export type UpsellRuleInput = z.input<typeof upsellRuleInputSchema>;

export type AdminUpsellRule = {
  id: string;
  type: UpsellType;
  name: string;
  triggerProductId: string | null;
  triggerCategoryId: string | null;
  offerProduct: { id: string; name: string; imageUrl: string | null; price: number };
  discountType: DiscountType;
  discountValue: number;
  priority: number;
  isActive: boolean;
};

// ───────────── Categories and brands ─────────────

export const adminSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
});
export type AdminSearchQuery = z.infer<typeof adminSearchQuerySchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugInputSchema,
  parentId: id.nullish().transform((v) => v ?? null),
  description: optionalText(2000),
  imageUrl: optionalText(2048),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  productCount: number;
};

export const brandInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugInputSchema,
  logoUrl: optionalText(2048),
});
export type BrandInput = z.input<typeof brandInputSchema>;

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
};

/** Options for the product form selects (category, brand, attribute name suggestions). */
export type AdminCatalogOptions = {
  categories: { id: string; name: string; parentId: string | null }[];
  brands: { id: string; name: string }[];
  attributes: { name: string; values: string[] }[];
};

/** "Warm White LED Strip" -> "warm-white-led-strip" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}
