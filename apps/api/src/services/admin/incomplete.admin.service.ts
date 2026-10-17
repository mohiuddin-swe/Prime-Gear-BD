import type { Prisma } from "@primegear/db";
import type {
  AdminIncompleteOrder,
  ConvertIncompleteInput,
  OrderFilter,
} from "@primegear/shared";
import { z } from "zod";
import { AppError } from "../../lib/app-error";
import { audit, type Actor } from "../../lib/audit";
import { getPrisma } from "../../lib/prisma";
import { generateOrderNumber } from "../order.service";
import { isUniqueViolation } from "./catalog-effects";
import { WORKABLE_INCOMPLETE as WORKABLE, incompleteWhere } from "./order-filters";
import { buildOrderLines } from "./order.admin.service";

const ORDER_NUMBER_ATTEMPTS = 5;

// cartSnapshot is written by the checkout (incomplete-order.service); read it defensively
const snapshotSchema = z
  .array(
    z.object({
      productId: z.string(),
      variantId: z.string(),
      name: z.string(),
      variantName: z.string().nullable().default(null),
      sku: z.string(),
      quantity: z.number().int(),
      unitPrice: z.number().int(),
      lineTotal: z.number().int(),
    }),
  )
  .catch([]);

type Row = Prisma.IncompleteOrderGetPayload<object>;

const toAdmin = (r: Row): AdminIncompleteOrder => ({
  id: r.id,
  status: r.status,
  name: r.name,
  phone: r.phone,
  address: r.address,
  district: r.district,
  thana: r.thana,
  subtotal: r.subtotal,
  items: snapshotSchema.parse(r.cartSnapshot),
  lastActivityAt: r.lastActivityAt.toISOString(),
  createdAt: r.createdAt.toISOString(),
  convertedOrderId: r.convertedOrderId,
});

export async function listIncompleteOrders(
  storeId: string,
  q: OrderFilter & { page: number; limit: number },
) {
  const prisma = getPrisma();
  const where = incompleteWhere(storeId, q);
  const [total, rows] = await Promise.all([
    prisma.incompleteOrder.count({ where }),
    prisma.incompleteOrder.findMany({
      where,
      orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  return { items: rows.map(toAdmin), total };
}

export async function setIncompleteStatus(
  actor: Actor,
  id: string,
  status: "OPEN" | "CONTACTED" | "DISCARDED",
) {
  return getPrisma().$transaction(async (tx) => {
    const row = await tx.incompleteOrder.findFirst({ where: { id, storeId: actor.storeId } });
    if (!row) throw AppError.notFound("Checkout not found", "INCOMPLETE_NOT_FOUND");
    if (!(WORKABLE as readonly string[]).includes(row.status)) {
      throw new AppError(409, "INCOMPLETE_CLOSED", "This checkout was already converted or discarded");
    }
    const updated = await tx.incompleteOrder.update({ where: { id }, data: { status } });
    await audit(tx, actor, {
      action: "incomplete.status",
      entity: "IncompleteOrder",
      entityId: id,
      before: { status: row.status },
      after: { status },
    });
    return toAdmin(updated);
  });
}

/**
 * The agent called the customer and took the order: a PENDING order (source PHONE) with the
 * checkout's ad identifiers, so the Purchase sent on confirmation is still attributed.
 * No Lead is sent: the customer did not submit the checkout.
 */
export async function convertIncompleteOrder(
  actor: Actor,
  id: string,
  input: ConvertIncompleteInput & { phone: string; discount: number },
) {
  const { storeId } = actor;
  for (let attempt = 1; ; attempt++) {
    try {
      return await getPrisma().$transaction((tx) => convert(tx, actor, id, input));
    } catch (err) {
      // Order-number collision: try another number
      if (!isUniqueViolation(err) || attempt >= ORDER_NUMBER_ATTEMPTS) throw err;
    }
  }

  async function convert(tx: Prisma.TransactionClient, a: Actor, incompleteId: string, data: typeof input) {
    const row = await tx.incompleteOrder.findFirst({ where: { id: incompleteId, storeId } });
    if (!row) throw AppError.notFound("Checkout not found", "INCOMPLETE_NOT_FOUND");
    const claimed = await tx.incompleteOrder.updateMany({
      where: { id: row.id, storeId, status: { in: [...WORKABLE] } },
      data: { status: "CONVERTED" },
    });
    if (claimed.count === 0) {
      throw new AppError(409, "INCOMPLETE_CLOSED", "This checkout was already converted or discarded");
    }

    const lines = await buildOrderLines(tx, storeId, data.items, []);
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const total = subtotal - data.discount + data.shippingFee;
    const customer = await tx.customer.upsert({
      where: { storeId_phone: { storeId, phone: data.phone } },
      update: {},
      create: { storeId, phone: data.phone, name: data.name },
      select: { id: true },
    });

    const order = await tx.order.create({
      data: {
        storeId,
        orderNumber: generateOrderNumber(),
        customerId: customer.id,
        phone: data.phone,
        name: data.name,
        address: data.address,
        district: data.district,
        thana: data.thana,
        note: data.note,
        subtotal,
        discount: data.discount,
        shippingFee: data.shippingFee,
        total,
        paymentMethod: "COD",
        status: "PENDING",
        source: "PHONE",
        fbclid: row.fbclid,
        fbp: row.fbp,
        fbc: row.fbc,
        ttclid: row.ttclid,
        ttp: row.ttp,
        gaClientId: row.gaClientId,
        clientIp: row.clientIp,
        userAgent: row.userAgent,
        items: { create: lines },
        statusLogs: {
          create: {
            storeId,
            fromStatus: null,
            toStatus: "PENDING",
            note: "Created from an incomplete checkout",
            adminUserId: a.adminUserId,
          },
        },
        payments: { create: { storeId, method: "COD", status: "PENDING", amount: total } },
      },
      select: { id: true, orderNumber: true, total: true },
    });
    await tx.incompleteOrder.update({ where: { id: row.id }, data: { convertedOrderId: order.id } });
    await audit(tx, a, {
      action: "incomplete.convert",
      entity: "IncompleteOrder",
      entityId: row.id,
      before: { status: row.status },
      after: { status: "CONVERTED", orderId: order.id, orderNumber: order.orderNumber, total },
    });
    return { orderId: order.id, orderNumber: order.orderNumber, total: order.total };
  }
}
