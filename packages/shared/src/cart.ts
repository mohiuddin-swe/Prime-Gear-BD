import { z } from "zod";

/** More than this per product goes through a WhatsApp bulk order instead. */
export const MAX_QTY_PER_PRODUCT = 10;

export const SHIPPING_ZONES = ["INSIDE_DHAKA", "OUTSIDE_DHAKA"] as const;
export type ShippingZone = (typeof SHIPPING_ZONES)[number];

const qtySchema = z.coerce.number().int().min(1).max(MAX_QTY_PER_PRODUCT);

export const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: qtySchema.default(1),
  /** Set when the item is added from an upsell offer; drives the discount and upsellSource */
  upsellRuleId: z.string().min(1).optional(),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({ quantity: qtySchema });
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const cartItemParamsSchema = z.object({ id: z.string().min(1) });

export const cartQuerySchema = z.object({ zone: z.enum(SHIPPING_ZONES).optional() });
export type CartQuery = z.infer<typeof cartQuerySchema>;

export const cartUpsellQuerySchema = z.object({ productId: z.string().min(1) });

export type UpsellSourceKind =
  "BULK_TIER" | "BUY_TOGETHER" | "CART_UPSELL" | "CHECKOUT_UPSELL" | "POST_ORDER";

// ───────────── Response shapes ─────────────

export type CartLine = {
  id: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantName: string | null;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  stock: number;
  /** Price before any tier or upsell discount (BDT) */
  baseUnitPrice: number;
  /** Price per unit after the bulk tier (BDT) */
  unitPrice: number;
  /** BDT taken off one unit by an upsell offer (0 when none) */
  upsellDiscount: number;
  lineTotal: number;
  /** Total saved on this line versus baseUnitPrice * quantity */
  savings: number;
  tier: { minQty: number; unitPrice: number } | null;
  /** The next bulk tier and how many more units unlock it */
  nextTier: { minQty: number; unitPrice: number; addQty: number } | null;
  upsellSource: UpsellSourceKind | null;
};

export type CartPricing = {
  /** Sum of base prices (before discounts and shipping) */
  subtotal: number;
  /** Bulk tier and upsell savings */
  discount: number;
  /** null until the delivery zone is known */
  shippingFee: number | null;
  total: number;
};

export type CartView = {
  id: string | null;
  items: CartLine[];
  itemCount: number;
  pricing: CartPricing;
  freeDelivery: {
    /** null = free delivery is not offered */
    threshold: number | null;
    remaining: number;
    qualifies: boolean;
  };
  shipping: { insideDhaka: number; outsideDhaka: number };
  /** Delivery time per zone from the store settings, e.g. "1–2 days" */
  deliveryEta: { insideDhaka: string; outsideDhaka: string };
  maxQtyPerProduct: number;
  /** For the bulk-order prompt above the per-product limit */
  whatsappNumber: string | null;
};

export type UpsellOffer = {
  ruleId: string;
  type: "BUY_TOGETHER" | "CART_UPSELL" | "CHECKOUT_UPSELL" | "POST_ORDER";
  name: string;
  productId: string;
  slug: string;
  productName: string;
  imageUrl: string | null;
  /** The variant a one-tap add puts in the cart (cheapest in stock) */
  variantId: string;
  originalPrice: number;
  offerPrice: number;
};
