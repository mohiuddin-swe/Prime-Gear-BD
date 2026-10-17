import type { Prisma } from "@primegear/db";
import {
  ORDER_STATUSES,
  isOrderEditable,
  shippingZoneForDistrict,
  type AdminOrderCounts,
  type AdminOrderDetail,
  type AdminOrderListQuery,
  type AdminOrderRow,
  type AdminShippingFees,
  type AdminVariantOption,
  type CustomerHistorySummary,
  type OrderAddressInput,
  type OrderFilter,
  type OrderItemsInput,
  type OrderStatus,
} from "@primegear/shared";
import { AppError } from "../../lib/app-error";
import { audit, type Actor } from "../../lib/audit";
import { getPrisma } from "../../lib/prisma";
import { getStoreSettings } from "../settings.service";
import { incompleteWhere, orderWhere } from "./order-filters";

type Db = Prisma.TransactionClient;

// ───────────── Customer history ─────────────

type HistoryCounts = Map<string, Partial<Record<OrderStatus, number>>>;

async function historyByPhone(db: Db, storeId: string, phones: string[]): Promise<HistoryCounts> {
  const map: HistoryCounts = new Map();
  if (phones.length === 0) return map;
  const groups = await db.order.groupBy({
    by: ["phone", "status"],
    where: { storeId, phone: { in: [...new Set(phones)] } },
    _count: { _all: true },
  });
  for (const g of groups) {
    const entry = map.get(g.phone) ?? {};
    entry[g.status] = g._count._all;
    map.set(g.phone, entry);
  }
  return map;
}

/** Track record from the phone's other orders (the order being viewed is left out). */
function historyFor(counts: HistoryCounts, phone: string, own: OrderStatus): CustomerHistorySummary {
  const c = { ...counts.get(phone) };
  c[own] = Math.max(0, (c[own] ?? 0) - 1);
  const n = (s: OrderStatus) => c[s] ?? 0;
  return {
    previous: ORDER_STATUSES.reduce((sum, s) => sum + n(s), 0),
    delivered: n("DELIVERED") + n("PARTIAL_DELIVERED"),
    cancelled: n("CANCELLED"),
    returned: n("RETURNED"),
  };
}

// ───────────── List and counts ─────────────

const SUMMARY_LINES = 2;

export async function listAdminOrders(storeId: string, q: AdminOrderListQuery) {
  const prisma = getPrisma();
  const where = orderWhere(storeId, q, q.status);
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        name: true,
        phone: true,
        district: true,
        thana: true,
        address: true,
        total: true,
        source: true,
        noAnswerCount: true,
        lastContactAt: true,
        createdAt: true,
        confirmedAt: true,
        items: {
          select: { productName: true, variantName: true, quantity: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  const history = await historyByPhone(
    prisma,
    storeId,
    rows.map((r) => r.phone),
  );
  const items: AdminOrderRow[] = rows.map((o) => {
    const lines = o.items.map(
      (i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ""}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`,
    );
    const more = lines.length - SUMMARY_LINES;
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      name: o.name,
      phone: o.phone,
      district: o.district,
      thana: o.thana,
      address: o.address,
      total: o.total,
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      itemsSummary: lines.slice(0, SUMMARY_LINES).join(", ") + (more > 0 ? ` +${more} more` : ""),
      source: o.source,
      noAnswerCount: o.noAnswerCount,
      lastContactAt: o.lastContactAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      confirmedAt: o.confirmedAt?.toISOString() ?? null,
      history: historyFor(history, o.phone, o.status),
    };
  });
  return { items, total };
}

/** Tab counts under the current search and dates, plus open incomplete checkouts. */
export async function countAdminOrders(storeId: string, f: OrderFilter): Promise<AdminOrderCounts> {
  const prisma = getPrisma();
  const [groups, incomplete] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: orderWhere(storeId, f), _count: { _all: true } }),
    prisma.incompleteOrder.count({ where: incompleteWhere(storeId, f) }),
  ]);
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as AdminOrderCounts;
  for (const g of groups) counts[g.status] = g._count._all;
  counts.incomplete = incomplete;
  return counts;
}

// ───────────── Detail ─────────────

export async function getAdminOrder(storeId: string, id: string): Promise<AdminOrderDetail> {
  const prisma = getPrisma();
  const o = await prisma.order.findFirst({
    where: { id, storeId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: { select: { stock: true } },
          product: {
            select: {
              images: {
                where: { kind: "STANDARD" },
                select: { url: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
        },
      },
      statusLogs: {
        orderBy: { createdAt: "asc" },
        include: { adminUser: { select: { name: true } } },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { adminUser: { select: { name: true } } },
      },
    },
  });
  if (!o) throw AppError.notFound("Order not found", "ORDER_NOT_FOUND");

  const [history, others] = await Promise.all([
    historyByPhone(prisma, storeId, [o.phone]),
    prisma.order.findMany({
      where: { storeId, phone: o.phone, id: { not: o.id } },
      select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    name: o.name,
    phone: o.phone,
    district: o.district,
    thana: o.thana,
    address: o.address,
    note: o.note,
    total: o.total,
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shippingFee,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    source: o.source,
    noAnswerCount: o.noAnswerCount,
    lastContactAt: o.lastContactAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    confirmedAt: o.confirmedAt?.toISOString() ?? null,
    purchaseSentAt: o.purchaseSentAt?.toISOString() ?? null,
    history: historyFor(history, o.phone, o.status),
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      productName: i.productName,
      variantName: i.variantName,
      sku: i.sku,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
      imageUrl: i.product?.images[0]?.url ?? null,
      stock: i.variant?.stock ?? null,
    })),
    timeline: o.statusLogs.map((l) => ({
      id: l.id,
      fromStatus: l.fromStatus,
      toStatus: l.toStatus,
      note: l.note,
      adminName: l.adminUser?.name ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    notes: o.notes.map((n) => ({
      id: n.id,
      kind: n.kind,
      body: n.body,
      adminName: n.adminUser?.name ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    customerOrders: others.map((x) => ({ ...x, createdAt: x.createdAt.toISOString() })),
  };
}

// ───────────── Edits (PENDING only) ─────────────

export async function getShippingFees(storeId: string, db?: Db): Promise<AdminShippingFees> {
  const s = await getStoreSettings(storeId, db);
  return {
    insideDhaka: s.insideDhakaFee,
    outsideDhaka: s.outsideDhakaFee,
    freeDeliveryThreshold: s.freeDeliveryThreshold,
  };
}

/** Same rule as the checkout: zone fee, free once the goods reach the threshold. */
export function shippingFeeFor(fees: AdminShippingFees, district: string, goods: number) {
  if (fees.freeDeliveryThreshold && goods >= fees.freeDeliveryThreshold) return 0;
  return shippingZoneForDistrict(district) === "INSIDE_DHAKA" ? fees.insideDhaka : fees.outsideDhaka;
}

async function loadEditable(tx: Db, storeId: string, id: string) {
  const order = await tx.order.findFirst({
    where: { id, storeId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) throw AppError.notFound("Order not found", "ORDER_NOT_FOUND");
  if (!isOrderEditable(order.status)) {
    throw new AppError(409, "ORDER_NOT_EDITABLE", "Only pending orders can be edited");
  }
  return order;
}

/** Writes the new money fields, still guarded on PENDING (a confirm racing an edit loses cleanly). */
async function saveMoney(
  tx: Db,
  storeId: string,
  orderId: string,
  data: Prisma.OrderUpdateManyMutationInput & { total: number },
) {
  const res = await tx.order.updateMany({ where: { id: orderId, storeId, status: "PENDING" }, data });
  if (res.count === 0) {
    throw new AppError(409, "ORDER_STATUS_CHANGED", "This order was just confirmed or cancelled. Reload it.");
  }
  // The COD payment collects the new total
  await tx.payment.updateMany({
    where: { orderId, storeId, status: { in: ["PENDING", "UNPAID"] } },
    data: { amount: data.total },
  });
}

export async function updateOrderAddress(actor: Actor, id: string, input: OrderAddressInput & { phone: string }) {
  const { storeId } = actor;
  await getPrisma().$transaction(async (tx) => {
    const order = await loadEditable(tx, storeId, id);
    const customer = await tx.customer.upsert({
      where: { storeId_phone: { storeId, phone: input.phone } },
      update: {},
      create: { storeId, phone: input.phone, name: input.name },
      select: { id: true },
    });
    // Moving between inside and outside Dhaka changes the delivery fee
    let shippingFee = order.shippingFee;
    if (shippingZoneForDistrict(input.district) !== shippingZoneForDistrict(order.district)) {
      const fees = await getShippingFees(storeId, tx);
      shippingFee = shippingFeeFor(fees, input.district, order.total - order.shippingFee);
    }
    const total = order.total - order.shippingFee + shippingFee;
    const after = {
      name: input.name,
      phone: input.phone,
      address: input.address,
      district: input.district,
      thana: input.thana ?? null,
      customerId: customer.id,
      shippingFee,
      total,
    };
    await saveMoney(tx, storeId, order.id, after);
    await audit(tx, actor, {
      action: "order.address",
      entity: "Order",
      entityId: order.id,
      before: {
        name: order.name,
        phone: order.phone,
        address: order.address,
        district: order.district,
        thana: order.thana,
        shippingFee: order.shippingFee,
        total: order.total,
      },
      after,
    });
  });
  return getAdminOrder(storeId, id);
}

type LineInput = OrderItemsInput["items"][number];

/**
 * Builds order lines from the editor. Lines already on the order keep their name/SKU snapshot;
 * new lines snapshot the variant now. Moves stock by the quantity difference per variant.
 */
export async function buildOrderLines(
  tx: Db,
  storeId: string,
  lines: LineInput[],
  existing: { variantId: string | null; quantity: number; productName: string; variantName: string | null; sku: string; upsellSource: Prisma.OrderItemCreateManyInput["upsellSource"] }[],
) {
  const old = new Map(existing.filter((i) => i.variantId).map((i) => [i.variantId!, i]));
  const variants = await tx.productVariant.findMany({
    where: { storeId, id: { in: lines.map((l) => l.variantId) } },
    select: { id: true, name: true, sku: true, isActive: true, productId: true, product: { select: { name: true, status: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const rows = lines.map((line) => {
    const v = byId.get(line.variantId);
    if (!v) throw AppError.badRequest("An item is no longer in the catalog", "VARIANT_NOT_FOUND");
    const kept = old.get(line.variantId);
    if (!kept && (!v.isActive || v.product.status === "ARCHIVED")) {
      throw new AppError(409, "ITEM_UNAVAILABLE", `${v.product.name} is not for sale`);
    }
    return {
      storeId,
      productId: v.productId,
      variantId: v.id,
      productName: kept?.productName ?? v.product.name,
      variantName: kept ? kept.variantName : v.name === "Default" ? null : v.name,
      sku: kept?.sku ?? v.sku,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: line.unitPrice * line.quantity,
      upsellSource: kept?.upsellSource ?? null,
    };
  });

  // Stock: take what was added, give back what was removed (atomic, never below zero)
  const delta = new Map<string, number>();
  for (const [variantId, i] of old) delta.set(variantId, -i.quantity);
  for (const r of rows) delta.set(r.variantId, (delta.get(r.variantId) ?? 0) + r.quantity);
  for (const [variantId, d] of delta) {
    if (d > 0) {
      const res = await tx.productVariant.updateMany({
        where: { id: variantId, storeId, stock: { gte: d } },
        data: { stock: { decrement: d } },
      });
      if (res.count === 0) {
        const name = rows.find((r) => r.variantId === variantId)?.productName ?? "An item";
        throw new AppError(409, "INSUFFICIENT_STOCK", `${name}: not enough stock for ${d} more`);
      }
    } else if (d < 0) {
      await tx.productVariant.updateMany({ where: { id: variantId, storeId }, data: { stock: { increment: -d } } });
    }
  }
  return rows;
}

export async function updateOrderItems(actor: Actor, id: string, input: OrderItemsInput & { discount: number }) {
  const { storeId } = actor;
  await getPrisma().$transaction(async (tx) => {
    const order = await loadEditable(tx, storeId, id);
    const rows = await buildOrderLines(tx, storeId, input.items, order.items);
    const subtotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);
    const total = subtotal - input.discount + input.shippingFee;

    await tx.orderItem.deleteMany({ where: { orderId: order.id, storeId } });
    await tx.orderItem.createMany({ data: rows.map((r) => ({ ...r, orderId: order.id })) });
    await saveMoney(tx, storeId, order.id, {
      subtotal,
      discount: input.discount,
      shippingFee: input.shippingFee,
      total,
    });
    const lineSnapshot = (i: { sku: string; quantity: number; unitPrice: number; lineTotal: number }) => ({
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    });
    await audit(tx, actor, {
      action: "order.items",
      entity: "Order",
      entityId: order.id,
      before: {
        items: order.items.map(lineSnapshot),
        subtotal: order.subtotal,
        discount: order.discount,
        shippingFee: order.shippingFee,
        total: order.total,
      },
      after: { items: rows.map(lineSnapshot), subtotal, discount: input.discount, shippingFee: input.shippingFee, total },
    });
  });
  return getAdminOrder(storeId, id);
}

// ───────────── Notes and call attempts ─────────────

async function ensureOrder(db: Db, storeId: string, id: string) {
  const found = await db.order.count({ where: { id, storeId } });
  if (!found) throw AppError.notFound("Order not found", "ORDER_NOT_FOUND");
}

export async function addOrderNote(actor: Actor, id: string, body: string) {
  return getPrisma().$transaction(async (tx) => {
    await ensureOrder(tx, actor.storeId, id);
    const note = await tx.orderNote.create({
      data: { storeId: actor.storeId, orderId: id, adminUserId: actor.adminUserId, kind: "NOTE", body },
      include: { adminUser: { select: { name: true } } },
    });
    await tx.order.update({ where: { id }, data: { lastContactAt: note.createdAt } });
    await audit(tx, actor, { action: "order.note", entity: "Order", entityId: id, after: { body } });
    return {
      id: note.id,
      kind: note.kind,
      body: note.body,
      adminName: note.adminUser?.name ?? null,
      createdAt: note.createdAt.toISOString(),
    };
  });
}

/** One tap on "No answer": counts the attempt and timestamps it so the next agent sees it. */
export async function recordNoAnswer(actor: Actor, id: string) {
  return getPrisma().$transaction(async (tx) => {
    await ensureOrder(tx, actor.storeId, id);
    const now = new Date();
    const order = await tx.order.update({
      where: { id },
      data: { noAnswerCount: { increment: 1 }, lastContactAt: now },
      select: { noAnswerCount: true },
    });
    await tx.orderNote.create({
      data: { storeId: actor.storeId, orderId: id, adminUserId: actor.adminUserId, kind: "NO_ANSWER", createdAt: now },
    });
    await audit(tx, actor, {
      action: "order.no_answer",
      entity: "Order",
      entityId: id,
      after: { noAnswerCount: order.noAnswerCount },
    });
    return { noAnswerCount: order.noAnswerCount, lastContactAt: now.toISOString() };
  });
}

// ───────────── Item picker ─────────────

export async function searchOrderVariants(storeId: string, q: string): Promise<AdminVariantOption[]> {
  const contains = { contains: q, mode: "insensitive" } as const;
  const rows = await getPrisma().productVariant.findMany({
    where: {
      storeId,
      isActive: true,
      product: { status: { not: "ARCHIVED" } },
      OR: [{ sku: contains }, { name: contains }, { product: { name: contains } }],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      stock: true,
      product: {
        select: {
          name: true,
          images: { where: { kind: "STANDARD" }, select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
    orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    take: 15,
  });
  return rows.map((v) => ({
    variantId: v.id,
    productName: v.product.name,
    variantName: v.name === "Default" ? null : v.name,
    sku: v.sku,
    price: v.price,
    stock: v.stock,
    imageUrl: v.product.images[0]?.url ?? null,
  }));
}
