import type { RequestHandler } from "express";
import { env } from "../config/env";
import { AppError } from "../lib/app-error";
import { getPrisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- the only way to augment Express.Request
  namespace Express {
    interface Request {
      storeId: string;
    }
  }
}

let cachedStoreId: string | undefined;

/**
 * Resolves the single default store. Everything downstream reads req.storeId,
 * so going multi-tenant later only means changing this one function (host / header lookup).
 */
export async function resolveStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;
  const store = await getPrisma().store.findUnique({
    where: { slug: env.DEFAULT_STORE_SLUG },
    select: { id: true },
  });
  if (!store) throw new AppError(500, "STORE_NOT_FOUND", "Store is not configured");
  return (cachedStoreId = store.id);
}

export const storeContext: RequestHandler = async (req, _res, next) => {
  try {
    req.storeId = await resolveStoreId();
    next();
  } catch (err) {
    next(err);
  }
};
