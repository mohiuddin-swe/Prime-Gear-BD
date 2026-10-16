import type { IncompleteOrderInput } from "@primegear/shared";
import { getPrisma } from "../lib/prisma";
import { buildCartView, findActiveCart } from "./cart.service";
import type { RequestContext } from "./order.service";

/**
 * Abandoned-checkout capture: one OPEN row per cart session, updated as the visitor types.
 * Deleted when the order is placed (see order.service).
 */
export async function saveIncompleteOrder(
  storeId: string,
  sessionId: string | undefined,
  input: IncompleteOrderInput,
  ctx: RequestContext,
) {
  const cart = sessionId ? await findActiveCart(storeId, { sessionId }) : null;
  if (!sessionId || !cart) return { saved: false };

  const view = await buildCartView(storeId, cart.id);
  if (view.items.length === 0) return { saved: false };

  const prisma = getPrisma();
  const data = {
    phone: input.phone,
    name: input.name || null,
    address: input.address || null,
    district: input.district ?? null,
    thana: input.thana || null,
    cartSnapshot: view.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      name: i.name,
      variantName: i.variantName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    subtotal: view.pricing.subtotal - view.pricing.discount,
    fbclid: input.tracking.fbclid,
    fbp: input.tracking.fbp,
    fbc: input.tracking.fbc,
    ttclid: input.tracking.ttclid,
    ttp: input.tracking.ttp,
    gaClientId: input.tracking.gaClientId,
    clientIp: ctx.clientIp,
    userAgent: ctx.userAgent,
    lastActivityAt: new Date(),
  };

  const existing = await prisma.incompleteOrder.findFirst({
    where: { storeId, sessionId, status: "OPEN" },
    select: { id: true },
  });
  if (existing) {
    await prisma.incompleteOrder.update({ where: { id: existing.id }, data });
  } else {
    await prisma.incompleteOrder.create({ data: { storeId, sessionId, ...data } });
  }
  return { saved: true };
}
