import { z } from "zod";
import { paginationQuerySchema } from "./api";
import type { AdminRole } from "./auth";
import { bdPhoneSchema } from "./checkout";
import { BD_DISTRICTS } from "./districts";

// Admin order management: statuses, who may move an order where, and the request schemas.
// The API's order-status service enforces these rules; the admin screens use them to show only
// the actions that will succeed.

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "PARTIAL_DELIVERED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  PARTIAL_DELIVERED: "Partly delivered",
};

/** Everyone in the team works orders; packers only see the packing/shipping moves. */
export const ORDER_ADMIN_ROLES = ["OWNER", "MANAGER", "CALL_AGENT", "PACKER"] as const;
/** Editing items/address, notes, call attempts and incomplete checkouts: the call-center side. */
export const ORDER_EDIT_ROLES = ["OWNER", "MANAGER", "CALL_AGENT"] as const;

const CALL: readonly AdminRole[] = ORDER_EDIT_ROLES;
const FLOOR: readonly AdminRole[] = ["OWNER", "MANAGER", "PACKER"];
const MANAGERS: readonly AdminRole[] = ["OWNER", "MANAGER"];

/**
 * Allowed moves and the roles that may make them. Anything not listed is rejected.
 * CANCELLED -> PENDING reopens an order cancelled by mistake (stock is reserved again).
 */
export const ORDER_TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<OrderStatus, readonly AdminRole[]>>
> = {
  PENDING: { CONFIRMED: CALL, CANCELLED: CALL },
  CONFIRMED: { PACKED: FLOOR, CANCELLED: CALL },
  PACKED: { SHIPPED: FLOOR, CANCELLED: MANAGERS },
  SHIPPED: { DELIVERED: MANAGERS, PARTIAL_DELIVERED: MANAGERS, RETURNED: MANAGERS },
  DELIVERED: { RETURNED: MANAGERS },
  PARTIAL_DELIVERED: {},
  CANCELLED: { PENDING: CALL },
  RETURNED: {},
};

export const isAllowedTransition = (from: OrderStatus, to: OrderStatus) =>
  ORDER_TRANSITIONS[from][to] !== undefined;

export const canTransition = (from: OrderStatus, to: OrderStatus, role: AdminRole) =>
  ORDER_TRANSITIONS[from][to]?.includes(role) ?? false;

/** Statuses this role can move an order to from `from`, in the order the UI shows them. */
export const nextStatuses = (from: OrderStatus, role: AdminRole): OrderStatus[] =>
  ORDER_STATUSES.filter((to) => canTransition(from, to, role));

/** Items and address can change only while the order still waits for confirmation. */
export const isOrderEditable = (status: OrderStatus) => status === "PENDING";

/**
 * Ad platforms only accept server events up to 7 days after the click/lead, so a Purchase for an
 * order confirmed later than this may not be attributed.
 */
export const LATE_CONFIRM_DAYS = 7;
export const isLateConfirmation = (placedAt: Date | string, at: Date = new Date()) =>
  at.getTime() - new Date(placedAt).getTime() > LATE_CONFIRM_DAYS * 24 * 60 * 60 * 1000;

/** One-tap reasons on the cancel sheet (stored as the status-log note). */
export const CANCEL_REASONS = [
  "Customer cancelled",
  "Fake or test order",
  "Duplicate order",
  "Unreachable after several calls",
  "Out of stock",
  "Delivery fee or price",
] as const;

// ───────────── Dates (Bangladesh time, UTC+6, no DST) ─────────────

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** "2026-10-17" for a moment, on the Dhaka calendar */
export const dhakaDate = (at: Date = new Date()) =>
  new Date(at.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);

/** Dhaka calendar day shifted by `days` ("2026-10-17", -1 -> "2026-10-16") */
export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** [start, end) instants covering Dhaka days `from`..`to` inclusive. Either side may be open. */
export function dhakaRange(from?: string, to?: string) {
  return {
    gte: from ? new Date(`${from}T00:00:00+06:00`) : undefined,
    lt: to ? new Date(`${shiftDate(to, 1)}T00:00:00+06:00`) : undefined,
  };
}

// ───────────── Request schemas ─────────────

const id = z.string().trim().min(1).max(64);
const taka = z.number().int().min(0).max(10_000_000);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

/** Shared by the order list and the status counts: search + date filter */
export const orderFilterSchema = z
  .object({
    /** Phone (any format), order number or name */
    q: z.string().trim().max(100).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    message: "Start date must be before the end date",
    path: ["from"],
  });
export type OrderFilter = z.infer<typeof orderFilterSchema>;

export const adminOrderListQuerySchema = paginationQuerySchema
  .extend({
    q: z.string().trim().max(100).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    status: z.enum(ORDER_STATUSES).optional(),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    message: "Start date must be before the end date",
    path: ["from"],
  });
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const orderStatusChangeSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});
export type OrderStatusChangeInput = z.input<typeof orderStatusChangeSchema>;

export const BULK_ORDER_LIMIT = 100;
export const bulkOrderStatusSchema = z.object({
  ids: z.array(id).min(1).max(BULK_ORDER_LIMIT),
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});
export type BulkOrderStatusInput = z.input<typeof bulkOrderStatusSchema>;

export const orderNoteInputSchema = z.object({
  body: z.string().trim().min(1, "Write a note").max(1000),
});

export const orderAddressSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name").max(100),
  phone: bdPhoneSchema,
  address: z.string().trim().min(10, "Enter the full address").max(500),
  district: z.enum(BD_DISTRICTS),
  thana: optionalText(100),
});
export type OrderAddressInput = z.input<typeof orderAddressSchema>;

/** Admins can take bigger phone orders than the storefront's per-product cap. */
export const ADMIN_MAX_LINE_QTY = 999;

const orderItemsShape = {
  items: z
    .array(
      z.object({
        variantId: id,
        quantity: z.number().int().min(1).max(ADMIN_MAX_LINE_QTY),
        /** Agreed unit price (BDT). Existing lines keep their snapshot unless changed. */
        unitPrice: taka,
      }),
    )
    .min(1, "Add at least one item")
    .max(50),
  discount: taka.default(0),
  shippingFee: taka,
};

type ItemsShape = {
  items: { variantId: string; quantity: number; unitPrice: number }[];
  discount: number;
};

const checkItems = (v: ItemsShape, ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  v.items.forEach((item, i) => {
    if (seen.has(item.variantId)) {
      ctx.addIssue({ code: "custom", path: ["items", i, "variantId"], message: "Item is listed twice" });
    }
    seen.add(item.variantId);
  });
  const subtotal = v.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  if (v.discount > subtotal) {
    ctx.addIssue({ code: "custom", path: ["discount"], message: "Discount is more than the subtotal" });
  }
};

export const orderItemsInputSchema = z.object(orderItemsShape).superRefine(checkItems);
export type OrderItemsInput = z.input<typeof orderItemsInputSchema>;

export const INCOMPLETE_STATUSES = ["OPEN", "CONTACTED", "CONVERTED", "DISCARDED"] as const;
export type IncompleteStatus = (typeof INCOMPLETE_STATUSES)[number];

export const incompleteListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});

/** Agents mark a checkout contacted (they called) or discarded (junk); converting has its own endpoint. */
export const incompleteStatusSchema = z.object({
  status: z.enum(["OPEN", "CONTACTED", "DISCARDED"]),
});

export const convertIncompleteSchema = orderAddressSchema
  .extend({ ...orderItemsShape, note: optionalText(500) })
  .superRefine(checkItems);
export type ConvertIncompleteInput = z.input<typeof convertIncompleteSchema>;

export const variantSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

// ───────────── Response shapes ─────────────

/** A customer's track record by phone (this order excluded) */
export type CustomerHistorySummary = {
  previous: number;
  delivered: number;
  cancelled: number;
  returned: number;
};

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  name: string;
  phone: string;
  district: string;
  thana: string | null;
  address: string;
  total: number;
  itemCount: number;
  /** "LED Strip 5m ×2, Smart Plug" (first few lines) */
  itemsSummary: string;
  source: string;
  noAnswerCount: number;
  lastContactAt: string | null;
  createdAt: string;
  confirmedAt: string | null;
  history: CustomerHistorySummary;
};

export type AdminOrderCounts = Record<OrderStatus, number> & { incomplete: number };

export type AdminOrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
  /** Stock left on the variant now (null when the variant was deleted) */
  stock: number | null;
};

export type AdminOrderDetail = Omit<AdminOrderRow, "itemsSummary" | "itemCount"> & {
  note: string | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  paymentMethod: string;
  paymentStatus: string;
  purchaseSentAt: string | null;
  items: AdminOrderItem[];
  timeline: {
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note: string | null;
    adminName: string | null;
    createdAt: string;
  }[];
  notes: {
    id: string;
    kind: "NOTE" | "NO_ANSWER";
    body: string | null;
    adminName: string | null;
    createdAt: string;
  }[];
  /** Other orders from the same phone, newest first */
  customerOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    total: number;
    createdAt: string;
  }[];
};

export type OrderStatusResult = {
  id: string;
  orderNumber: string;
  from: OrderStatus;
  status: OrderStatus;
  /** Confirmed more than LATE_CONFIRM_DAYS after it was placed */
  lateConfirmation: boolean;
};

export type BulkOrderStatusResult = {
  updated: OrderStatusResult[];
  failed: { id: string; orderNumber: string | null; code: string; message: string }[];
};

export type AdminIncompleteOrder = {
  id: string;
  status: IncompleteStatus;
  name: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  thana: string | null;
  subtotal: number;
  items: {
    productId: string;
    variantId: string;
    name: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  lastActivityAt: string;
  createdAt: string;
  convertedOrderId: string | null;
};

export type AdminVariantOption = {
  variantId: string;
  productName: string;
  variantName: string | null;
  sku: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

/** Delivery fees for the order editors: the suggested fee when the district changes */
export type AdminShippingFees = { insideDhaka: number; outsideDhaka: number; freeDeliveryThreshold: number | null };
