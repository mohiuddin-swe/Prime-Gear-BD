import { env } from "../config/env";
import { logger } from "./logger";
import { getRedis } from "./redis";

/**
 * Read-through JSON cache. Keys carry a per-store version, so invalidating a store is a single INCR
 * (old keys just expire by TTL). Redis problems never break a request: we fall back to the loader.
 */
const versionKey = (storeId: string) => `catalog:ver:${storeId}`;

export async function cached<T>(storeId: string, key: string, load: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  let fullKey: string | undefined;
  try {
    const version = (await redis.get(versionKey(storeId))) ?? "0";
    fullKey = `catalog:${storeId}:${version}:${key}`;
    const hit = await redis.get(fullKey);
    if (hit) return JSON.parse(hit) as T;
  } catch (err) {
    logger.warn({ err }, "cache read failed");
  }
  const value = await load();
  if (fullKey) {
    try {
      await redis.set(fullKey, JSON.stringify(value), "EX", env.CATALOG_CACHE_TTL_SECONDS);
    } catch (err) {
      logger.warn({ err }, "cache write failed");
    }
  }
  return value;
}

/** Call after any admin write to products, variants, images, bulk tiers, categories or brands. */
export async function invalidateCatalogCache(storeId: string) {
  try {
    await getRedis().incr(versionKey(storeId));
  } catch (err) {
    logger.warn({ err }, "cache invalidation failed");
  }
}
