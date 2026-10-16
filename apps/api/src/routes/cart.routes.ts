import { Router } from "express";
import {
  addToCartSchema,
  cartItemParamsSchema,
  cartQuerySchema,
  cartUpsellQuerySchema,
  updateCartItemSchema,
} from "@primegear/shared";
import {
  addToCartHandler,
  getCartHandler,
  removeItemHandler,
  updateItemHandler,
  upsellsHandler,
} from "../controllers/cart.controller";
import { cartSession } from "../middleware/cart-session";
import { createRateLimiter } from "../middleware/rate-limit";
import { validate } from "../middleware/validate";

export const cartRouter = Router();

// Public write endpoints: limited per IP
const writeLimiter = createRateLimiter({ name: "cart", windowMs: 60_000, limit: 60 });

cartRouter.use("/cart", cartSession);
cartRouter.get("/cart", validate({ query: cartQuerySchema }), getCartHandler);
cartRouter.get("/cart/upsells", validate({ query: cartUpsellQuerySchema }), upsellsHandler);
cartRouter.post(
  "/cart",
  writeLimiter,
  validate({ body: addToCartSchema, query: cartQuerySchema }),
  addToCartHandler,
);
cartRouter.patch(
  "/cart/items/:id",
  writeLimiter,
  validate({ params: cartItemParamsSchema, body: updateCartItemSchema, query: cartQuerySchema }),
  updateItemHandler,
);
cartRouter.delete(
  "/cart/items/:id",
  writeLimiter,
  validate({ params: cartItemParamsSchema, query: cartQuerySchema }),
  removeItemHandler,
);
