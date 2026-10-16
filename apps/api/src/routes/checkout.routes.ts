import type { Request } from "express";
import { Router } from "express";
import {
  checkoutQuoteSchema,
  createOrderSchema,
  incompleteOrderSchema,
  normalizeBdPhone,
  orderNumberParamsSchema,
} from "@primegear/shared";
import {
  createOrderHandler,
  getOrderHandler,
  incompleteOrderHandler,
  quoteHandler,
} from "../controllers/checkout.controller";
import { cartSession } from "../middleware/cart-session";
import { createRateLimiter } from "../middleware/rate-limit";
import { validate } from "../middleware/validate";

export const checkoutRouter = Router();

const phoneOf = (req: Request) => {
  const phone: unknown = req.body?.phone;
  return typeof phone === "string" ? (normalizeBdPhone(phone) ?? undefined) : undefined;
};

// Order creation is limited twice: per IP (shared mobile networks, so generous) and per phone (strict)
const TEN_MIN = 10 * 60_000;
const orderIpLimiter = createRateLimiter({ name: "orders-ip", windowMs: TEN_MIN, limit: 20 });
const orderPhoneLimiter = createRateLimiter({
  name: "orders-phone",
  windowMs: TEN_MIN,
  limit: 3,
  identity: phoneOf,
  identityOnly: true,
});
const incompleteLimiter = createRateLimiter({
  name: "incomplete-ip",
  windowMs: 60_000,
  limit: 30,
});
const incompletePhoneLimiter = createRateLimiter({
  name: "incomplete-phone",
  windowMs: 60_000,
  limit: 20,
  identity: phoneOf,
  identityOnly: true,
});
const quoteLimiter = createRateLimiter({ name: "quote", windowMs: 60_000, limit: 60 });
const lookupLimiter = createRateLimiter({ name: "order-lookup", windowMs: 60_000, limit: 30 });

checkoutRouter.post(
  "/checkout/quote",
  cartSession,
  quoteLimiter,
  validate({ body: checkoutQuoteSchema }),
  quoteHandler,
);
checkoutRouter.post(
  "/orders",
  cartSession,
  orderIpLimiter,
  validate({ body: createOrderSchema }),
  orderPhoneLimiter, // after validation, so the phone it counts is the normalized one
  createOrderHandler,
);
checkoutRouter.post(
  "/incomplete-orders",
  cartSession,
  incompleteLimiter,
  validate({ body: incompleteOrderSchema }),
  incompletePhoneLimiter,
  incompleteOrderHandler,
);
checkoutRouter.get(
  "/orders/:orderNumber",
  lookupLimiter,
  validate({ params: orderNumberParamsSchema }),
  getOrderHandler,
);
