import type { Prisma } from "@primegear/db";
import {
  ORDER_STATUS_LABEL,
  canTransition,
  isAllowedTransition,
  isLateConfirmation,
  type BulkOrderStatusResult,
  type OrderStatus,
  type OrderStatusResult,
} from "@primegear/shared";
import { orderEvents } from "../../events/order-events";
import { AppError } from "../../lib/app-error";
import { audit, type Actor } from "../../lib/audit";
import { getPrisma } from "../../lib/prisma";

/**
 * THE way an order changes status. Validates the move (ORDER_TRANSITIONS and the actor's role),
 * writes OrderStatusLog + AuditLog in the same transaction, keeps stock in step and, after commit,
 * emits "order.confirmed" for PENDING -> CONFIRMED.
 */

// Cancelling before the parcel leaves puts the units back on the shelf; reopening takes them again
const RESTOCK_ON_CANCEL: readonly OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED"];

type Change = OrderStatusResult & {
  total: number;
  placedAt: Date;
  changedAt: Date;
};

async function applyStatusChange(
  tx: Prisma.TransactionClient,
  actor: Actor,
  orderId: string,
  to: OrderStatus,
  note: string | undefined,
): Promise<Change> {
  const order = await tx.order.findFirst({
    where: { id: orderId, storeId: actor.storeId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      items: { select: { variantId: true, quantity: true, productName: true } },
    },
  });
  if (!order) throw AppError.notFound("Order not found", "ORDER_NOT_FOUND");

  const from = order.status;
  if (from === to) {
    throw new AppError(409, "STATUS_UNCHANGED", `Order is already ${ORDER_STATUS_LABEL[to]}`);
  }
  if (!isAllowedTransition(from, to)) {
    throw new AppError(
      409,
      "INVALID_TRANSITION",
      `A ${ORDER_STATUS_LABEL[from]} order can't be marked ${ORDER_STATUS_LABEL[to]}`,
    );
  }
  if (actor.role && !canTransition(from, to, actor.role)) {
    throw AppError.forbidden(`Your role can't mark orders ${ORDER_STATUS_LABEL[to]}`);
  }

  const now = new Date();
  // Guarded on the status we read: a second agent acting on the same order gets a clear conflict
  const claimed = await tx.order.updateMany({
    where: { id: order.id, storeId: actor.storeId, status: from },
    data: { status: to, ...(to === "CONFIRMED" && { confirmedAt: now }) },
  });
  if (claimed.count === 0) {
    throw new AppError(409, "ORDER_STATUS_CHANGED", "Someone else just updated this order. Reload it.");
  }

  if (to === "CANCELLED" && RESTOCK_ON_CANCEL.includes(from)) {
    for (const item of order.items) {
      if (!item.variantId) continue;
      await tx.productVariant.updateMany({
        where: { id: item.variantId, storeId: actor.storeId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }
  if (from === "CANCELLED" && to === "PENDING") {
    for (const item of order.items) {
      if (!item.variantId) continue;
      const taken = await tx.productVariant.updateMany({
        where: { id: item.variantId, storeId: actor.storeId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (taken.count === 0) {
        throw new AppError(
          409,
          "INSUFFICIENT_STOCK",
          `${item.productName} has less than ${item.quantity} in stock`,
        );
      }
    }
  }

  await tx.orderStatusLog.create({
    data: {
      storeId: actor.storeId,
      orderId: order.id,
      fromStatus: from,
      toStatus: to,
      note,
      adminUserId: actor.adminUserId,
    },
  });
  await audit(tx, actor, {
    action: "order.status",
    entity: "Order",
    entityId: order.id,
    before: { status: from },
    after: { status: to, note },
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    from,
    status: to,
    lateConfirmation: to === "CONFIRMED" && isLateConfirmation(order.createdAt, now),
    total: order.total,
    placedAt: order.createdAt,
    changedAt: now,
  };
}

function afterCommit(actor: Actor, change: Change) {
  if (change.from === "PENDING" && change.status === "CONFIRMED") {
    orderEvents.emit("order.confirmed", {
      storeId: actor.storeId,
      orderId: change.id,
      orderNumber: change.orderNumber,
      total: change.total,
      placedAt: change.placedAt,
      confirmedAt: change.changedAt,
      adminUserId: actor.adminUserId,
      lateConfirmation: change.lateConfirmation,
    });
  }
}

const toResult = ({ id, orderNumber, from, status, lateConfirmation }: Change): OrderStatusResult => ({
  id,
  orderNumber,
  from,
  status,
  lateConfirmation,
});

export async function changeOrderStatus(
  actor: Actor,
  orderId: string,
  to: OrderStatus,
  note?: string,
): Promise<OrderStatusResult> {
  const change = await getPrisma().$transaction((tx) =>
    applyStatusChange(tx, actor, orderId, to, note),
  );
  afterCommit(actor, change);
  return toResult(change);
}

/** One transaction per order, so one bad order never blocks the rest of the batch. */
export async function bulkChangeOrderStatus(
  actor: Actor,
  ids: string[],
  to: OrderStatus,
  note?: string,
): Promise<BulkOrderStatusResult> {
  const result: BulkOrderStatusResult = { updated: [], failed: [] };
  for (const id of [...new Set(ids)]) {
    try {
      result.updated.push(await changeOrderStatus(actor, id, to, note));
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      const order = await getPrisma().order.findFirst({
        where: { id, storeId: actor.storeId },
        select: { orderNumber: true },
      });
      result.failed.push({
        id,
        orderNumber: order?.orderNumber ?? null,
        code: err.code,
        message: err.message,
      });
    }
  }
  return result;
}
