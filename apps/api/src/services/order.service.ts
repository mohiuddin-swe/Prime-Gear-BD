import { randomInt } from "node:crypto";
import { Prisma } from "@primegear/db";
import {
  MAX_QTY_PER_PRODUCT,
  maskPhone,
  shippingZoneForDistrict,
  type CreateOrderInput,
  type OrderCreated,
  type OrderSummary,
} from "@primegear/shared";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";
import { getPrisma } from "../lib/prisma";
import { getRedis } from "../lib/redis";
import { findActiveCart, loadPricedCart } from "./cart.service";

export type RequestContext = { clientIp?: string; userAgent?: string };

const LOCK_SECONDS = 30;
const IDEMPOTENCY_SECONDS = 24 * 60 * 60;
const ORDER_NUMBER_ATTEMPTS = 5;

/** PG + 8 digits. Random rather than sequential so order volume is not visible to anyone with a link. */
export const generateOrderNumber = () => `PG${randomInt(10_000_000, 100_000_000)}`;

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

// Redis only makes duplicate submits cheaper to detect; the cart claim in the transaction is the real guard.
async function redisSafe<T>(op: () => Promise<T>): Promise<T | undefined> {
  try {
    return await op();
  } catch (err) {
    logger.warn({ err }, "order idempotency redis call failed");
    return undefined;
  }
}

export async function createOrder(
  storeId: string,
  sessionId: string | undefined,
  input: CreateOrderInput,
  ctx: RequestContext,
): Promise<OrderCreated> {
  const prisma = getPrisma();
  const idemKey = `order:idem:${storeId}:${input.idempotencyKey}`;

  // 1. The same submit retried (double tap, flaky network): return the order it already created
  const previous = await redisSafe(() => getRedis().get(idemKey));
  if (previous) return JSON.parse(previous) as OrderCreated;

  const cart = sessionId ? await findActiveCart(storeId, { sessionId }) : null;
  if (!cart) throw AppError.badRequest("Your cart is empty", "CART_EMPTY");

  // 2. Two submits racing: only one gets the lock
  const lockKey = `order:lock:${cart.id}`;
  const locked = await redisSafe(() => getRedis().set(lockKey, "1", "EX", LOCK_SECONDS, "NX"));
  if (locked === null) {
    throw new AppError(
      409,
      "ORDER_IN_PROGRESS",
      "Your order is being placed. Please wait a moment.",
    );
  }

  try {
    let created: OrderCreated | undefined;
    for (let attempt = 1; !created; attempt++) {
      try {
        created = await prisma.$transaction((tx) =>
          placeOrder(tx, storeId, cart.id, sessionId, input, ctx),
        );
      } catch (err) {
        // Extremely unlikely order-number collision: pick another number
        if (!isUniqueViolation(err) || attempt >= ORDER_NUMBER_ATTEMPTS) throw err;
      }
    }
    await redisSafe(() =>
      getRedis().set(idemKey, JSON.stringify(created), "EX", IDEMPOTENCY_SECONDS),
    );
    return created;
  } finally {
    await redisSafe(() => getRedis().del(lockKey));
  }
}

async function placeOrder(
  tx: Prisma.TransactionClient,
  storeId: string,
  cartId: string,
  sessionId: string | undefined,
  input: CreateOrderInput,
  ctx: RequestContext,
): Promise<OrderCreated> {
  // Claim the cart first: a second order for the same cart finds it already CONVERTED
  const claim = await tx.cart.updateMany({
    where: { id: cartId, status: "ACTIVE" },
    data: { status: "CONVERTED" },
  });
  if (claim.count === 0) {
    throw new AppError(409, "ORDER_ALREADY_PLACED", "This cart has already been ordered");
  }

  // Everything below is priced from the database, never from what the browser sent
  const zone = shippingZoneForDistrict(input.district);
  const { rows, priced } = await loadPricedCart(tx, storeId, cartId, zone);
  const totalLines = await tx.cartItem.count({ where: { cartId } });
  if (rows.length === 0) throw AppError.badRequest("Your cart is empty", "CART_EMPTY");
  if (rows.length < totalLines) {
    throw new AppError(409, "ITEM_UNAVAILABLE", "An item in your cart is no longer available");
  }

  const perProduct = new Map<string, number>();
  for (const r of rows)
    perProduct.set(r.productId, (perProduct.get(r.productId) ?? 0) + r.quantity);
  for (const [, qty] of perProduct) {
    if (qty > MAX_QTY_PER_PRODUCT) {
      throw new AppError(
        409,
        "CART_LIMIT_EXCEEDED",
        `Up to ${MAX_QTY_PER_PRODUCT} of one product per order`,
      );
    }
  }

  // Atomic stock check + decrement: the row only updates while enough stock is left
  for (const r of rows) {
    const res = await tx.productVariant.updateMany({
      where: { id: r.variantId, stock: { gte: r.quantity } },
      data: { stock: { decrement: r.quantity } },
    });
    if (res.count === 0) {
      throw new AppError(
        409,
        "INSUFFICIENT_STOCK",
        `${r.product.name} is out of stock or has less than ${r.quantity} left`,
      );
    }
  }

  // Phone is the customer's identity: one Customer per phone, reused across orders
  const customer = await tx.customer.upsert({
    where: { storeId_phone: { storeId, phone: input.phone } },
    update: {},
    create: { storeId, phone: input.phone, name: input.name },
    select: { id: true },
  });

  const pricedById = new Map(priced.lines.map((l) => [l.id, l]));
  const orderNumber = generateOrderNumber();
  const leadEventId = `lead_${orderNumber}`;
  const t = input.tracking;

  const order = await tx.order.create({
    data: {
      storeId,
      orderNumber,
      customerId: customer.id,
      phone: input.phone,
      name: input.name,
      address: input.address,
      district: input.district,
      thana: input.thana,
      note: input.note,
      subtotal: priced.subtotal,
      discount: priced.discount,
      shippingFee: priced.shippingFee ?? 0,
      total: priced.total,
      paymentMethod: input.paymentMethod,
      status: "PENDING",
      source: "WEBSITE",
      fbclid: t.fbclid,
      fbp: t.fbp,
      fbc: t.fbc,
      ttclid: t.ttclid,
      ttp: t.ttp,
      gaClientId: t.gaClientId,
      clientIp: ctx.clientIp,
      userAgent: ctx.userAgent,
      leadEventId,
      // Snapshot name, SKU and price now: later catalog edits never change a placed order
      items: {
        create: rows.map((r) => {
          const p = pricedById.get(r.id)!;
          return {
            storeId,
            productId: r.productId,
            variantId: r.variantId,
            productName: r.product.name,
            variantName: r.variant.name === "Default" ? null : r.variant.name,
            sku: r.variant.sku,
            unitPrice: p.unitPrice,
            quantity: r.quantity,
            lineTotal: p.lineTotal,
            upsellSource: r.upsellSource,
          };
        }),
      },
      statusLogs: {
        create: { storeId, fromStatus: null, toStatus: "PENDING", note: "Order placed on website" },
      },
      payments: {
        create: { storeId, method: input.paymentMethod, status: "PENDING", amount: priced.total },
      },
    },
    select: { id: true, orderNumber: true, total: true },
  });

  // The checkout is finished: drop the abandoned-checkout record(s) for this visitor and phone
  await tx.incompleteOrder.deleteMany({
    where: {
      storeId,
      status: "OPEN",
      OR: [{ phone: input.phone }, ...(sessionId ? [{ sessionId }] : [])],
    },
  });

  return {
    orderNumber: order.orderNumber,
    leadEventId,
    total: order.total,
    customerId: customer.id,
  };
}

/** Public thank-you page data. The phone is masked and the address is not returned. */
export async function getOrderSummary(storeId: string, orderNumber: string): Promise<OrderSummary> {
  const order = await getPrisma().order.findUnique({
    where: { storeId_orderNumber: { storeId, orderNumber } },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) throw AppError.notFound("Order not found", "ORDER_NOT_FOUND");
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      name: i.productName,
      variantName: i.variantName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    shippingFee: order.shippingFee,
    total: order.total,
    paymentMethod: order.paymentMethod,
    district: order.district,
    maskedPhone: maskPhone(order.phone),
  };
}
