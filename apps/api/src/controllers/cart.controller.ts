import type { CookieOptions, Request, Response } from "express";
import type { AddToCartInput, CartQuery, UpdateCartItemInput } from "@primegear/shared";
import { isProd } from "../config/env";
import { sendOk } from "../lib/response";
import { CART_COOKIE } from "../middleware/cart-session";
import {
  addToCart,
  buildCartView,
  getCart,
  getUpsellOffers,
  removeCartItem,
  updateCartItem,
  type CartOwner,
} from "../services/cart.service";

const CART_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const cartCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge: CART_COOKIE_MAX_AGE_MS,
};

// Customer login does not exist yet; when it does, set customerId here from the customer cookie
const ownerOf = (req: Request): CartOwner => ({ sessionId: req.cartSessionId });

const zoneOf = (req: Request) => (req.query as CartQuery).zone;

export async function getCartHandler(req: Request, res: Response) {
  sendOk(res, await getCart(req.storeId, ownerOf(req), zoneOf(req)));
}

export async function addToCartHandler(req: Request, res: Response) {
  const { sessionId, cartId } = await addToCart(
    req.storeId,
    ownerOf(req),
    req.body as AddToCartInput,
  );
  if (sessionId && sessionId !== req.cartSessionId) {
    res.cookie(CART_COOKIE, sessionId, cartCookieOptions);
  }
  sendOk(res, await buildCartView(req.storeId, cartId, zoneOf(req)));
}

export async function updateItemHandler(req: Request, res: Response) {
  const { quantity } = req.body as UpdateCartItemInput;
  const cartId = await updateCartItem(req.storeId, ownerOf(req), req.params.id as string, quantity);
  sendOk(res, await buildCartView(req.storeId, cartId, zoneOf(req)));
}

export async function removeItemHandler(req: Request, res: Response) {
  const cartId = await removeCartItem(req.storeId, ownerOf(req), req.params.id as string);
  sendOk(res, await buildCartView(req.storeId, cartId, zoneOf(req)));
}

export async function upsellsHandler(req: Request, res: Response) {
  const { productId } = req.query as unknown as { productId: string };
  sendOk(res, await getUpsellOffers(req.storeId, ownerOf(req), productId));
}
