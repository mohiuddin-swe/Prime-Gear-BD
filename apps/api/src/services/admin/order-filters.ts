import type { Prisma } from "@primegear/db";
import { dhakaRange, normalizeBdPhone, type OrderFilter, type OrderStatus } from "@primegear/shared";

// Search + date filters shared by the order list, the tab counts and the incomplete-checkout list.

type Clause = { phone?: string | { contains: string }; orderNumber?: { contains: string }; name?: object };

/** Phone (any format, or a run of digits), order number or name. */
function searchClauses(q: string | undefined, withOrderNumber: boolean): Clause[] | undefined {
  if (!q) return undefined;
  const phone = normalizeBdPhone(q);
  if (phone) return [{ phone }];
  const or: Clause[] = [{ name: { contains: q, mode: "insensitive" } }];
  if (withOrderNumber) or.push({ orderNumber: { contains: q.toUpperCase() } });
  const digits = q.replace(/[\s\-+()]/g, "").replace(/^880/, "0");
  if (/^\d{3,}$/.test(digits)) or.push({ phone: { contains: digits } });
  return or;
}

/** Dhaka-day date range on createdAt */
function dateWhere(from?: string, to?: string) {
  const { gte, lt } = dhakaRange(from, to);
  return gte || lt ? { ...(gte && { gte }), ...(lt && { lt }) } : undefined;
}

export function orderWhere(storeId: string, f: OrderFilter, status?: OrderStatus): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { storeId };
  if (status) where.status = status;
  const createdAt = dateWhere(f.from, f.to);
  if (createdAt) where.createdAt = createdAt;
  const or = searchClauses(f.q, true);
  if (or) where.OR = or as Prisma.OrderWhereInput[];
  return where;
}

/** Abandoned checkouts the team still works: not converted, not discarded. */
export const WORKABLE_INCOMPLETE = ["OPEN", "CONTACTED"] as const;

export function incompleteWhere(storeId: string, f: OrderFilter): Prisma.IncompleteOrderWhereInput {
  const where: Prisma.IncompleteOrderWhereInput = { storeId, status: { in: [...WORKABLE_INCOMPLETE] } };
  const createdAt = dateWhere(f.from, f.to);
  if (createdAt) where.createdAt = createdAt;
  const or = searchClauses(f.q, false); // no order number yet
  if (or) where.OR = or as Prisma.IncompleteOrderWhereInput[];
  return where;
}
