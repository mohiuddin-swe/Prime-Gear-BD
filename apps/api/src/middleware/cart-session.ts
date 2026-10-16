import type { RequestHandler } from "express";

export const CART_COOKIE = "pg_cart";
const SESSION_FORMAT = /^[A-Za-z0-9_-]{20,64}$/;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- the only way to augment Express.Request
  namespace Express {
    interface Request {
      /** Guest cart id from the cookie (undefined when absent or malformed) */
      cartSessionId?: string;
    }
  }
}

export const cartSession: RequestHandler = (req, _res, next) => {
  const value: unknown = req.cookies?.[CART_COOKIE];
  if (typeof value === "string" && SESSION_FORMAT.test(value)) req.cartSessionId = value;
  next();
};
