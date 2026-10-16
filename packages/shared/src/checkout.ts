import { z } from "zod";
import { BD_DISTRICTS } from "./districts";
import { normalizeBdPhone } from "./phone";

/** Validates a BD mobile number and outputs it normalized (01XXXXXXXXX). */
export const bdPhoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const phone = normalizeBdPhone(v);
    if (!phone)
      ctx.addIssue({ code: "custom", message: "Enter a valid Bangladeshi mobile number" });
    return phone ?? "";
  });

const districtSchema = z.enum(BD_DISTRICTS);

// Marketing identifiers captured in the browser. Empty strings are dropped, never stored.
const idSchema = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => v || undefined);

export const trackingSchema = z
  .object({
    fbclid: idSchema,
    fbp: idSchema,
    fbc: idSchema,
    ttclid: idSchema,
    ttp: idSchema,
    gaClientId: idSchema,
  })
  .prefault({});
export type TrackingIds = z.infer<typeof trackingSchema>;

export const checkoutQuoteSchema = z.object({ district: districtSchema.optional() });
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;

export const createOrderSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: bdPhoneSchema,
  address: z.string().trim().min(10, "Enter your full address").max(500),
  district: districtSchema,
  thana: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || undefined),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
  paymentMethod: z.literal("COD").default("COD"),
  /** Client-generated per checkout attempt: a retry of the same submit returns the same order */
  idempotencyKey: z.string().min(8).max(100),
  tracking: trackingSchema,
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const incompleteOrderSchema = z.object({
  name: z.string().trim().max(100).optional(),
  phone: bdPhoneSchema,
  address: z.string().trim().max(500).optional(),
  district: districtSchema.optional(),
  thana: z.string().trim().max(100).optional(),
  tracking: trackingSchema,
});
export type IncompleteOrderInput = z.infer<typeof incompleteOrderSchema>;

export const orderNumberParamsSchema = z.object({
  orderNumber: z.string().regex(/^PG\d{8}$/, "Invalid order number"),
});

// ───────────── Response shapes ─────────────

export type OrderCreated = {
  orderNumber: string;
  /** Shared by the browser generate_lead event and the server-side Lead for deduplication */
  leadEventId: string;
  total: number;
  customerId: string;
};

export type OrderSummary = {
  orderNumber: string;
  status: string;
  createdAt: string;
  items: {
    name: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  paymentMethod: "COD" | "BKASH" | "NAGAD" | "SSLCOMMERZ";
  district: string;
  maskedPhone: string;
};
