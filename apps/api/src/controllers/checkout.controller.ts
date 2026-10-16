import type { Request, Response } from "express";
import {
  shippingZoneForDistrict,
  type CheckoutQuoteInput,
  type CreateOrderInput,
  type IncompleteOrderInput,
} from "@primegear/shared";
import { clientIp, clientUserAgent } from "../lib/client-ip";
import { sendOk } from "../lib/response";
import { buildCartView, findActiveCart } from "../services/cart.service";
import { saveIncompleteOrder } from "../services/incomplete-order.service";
import { createOrder, getOrderSummary } from "../services/order.service";

const ctxOf = (req: Request) => ({ clientIp: clientIp(req), userAgent: clientUserAgent(req) });

/** Re-prices the cart on the server for the chosen district; the browser never computes money. */
export async function quoteHandler(req: Request, res: Response) {
  const { district } = req.body as CheckoutQuoteInput;
  const zone = district ? shippingZoneForDistrict(district) : undefined;
  const cart = req.cartSessionId
    ? await findActiveCart(req.storeId, { sessionId: req.cartSessionId })
    : null;
  const view = await buildCartView(req.storeId, cart?.id ?? null, zone);
  sendOk(res, { ...view, zone: zone ?? null });
}

export async function createOrderHandler(req: Request, res: Response) {
  const created = await createOrder(
    req.storeId,
    req.cartSessionId,
    req.body as CreateOrderInput,
    ctxOf(req),
  );
  sendOk(res, created, undefined, 201);
}

export async function incompleteOrderHandler(req: Request, res: Response) {
  sendOk(
    res,
    await saveIncompleteOrder(
      req.storeId,
      req.cartSessionId,
      req.body as IncompleteOrderInput,
      ctxOf(req),
    ),
  );
}

export async function getOrderHandler(req: Request, res: Response) {
  sendOk(res, await getOrderSummary(req.storeId, req.params.orderNumber as string));
}
