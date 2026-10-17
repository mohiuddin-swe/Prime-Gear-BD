import { invalidateCatalogCache } from "../../lib/cache";
import { logger } from "../../lib/logger";
import { getStorage, belongsToStore } from "../../lib/storage";
import { enqueueProductSync, enqueueStorageDelete } from "../../queues";

/**
 * After a committed catalog write: drop the storefront cache and resync the touched products into
 * search. Queue trouble is logged, never thrown: the write itself already succeeded.
 */
export async function afterCatalogWrite(storeId: string, productIds: string[] = []) {
  await invalidateCatalogCache(storeId);
  try {
    await Promise.all([...new Set(productIds)].map((id) => enqueueProductSync(id)));
  } catch (err) {
    logger.warn({ err, productIds }, "search sync enqueue failed");
  }
}

/** Queues deletion of uploaded files that are no longer referenced (only our own, only this store's). */
export async function deleteStoredFiles(storeId: string, urls: (string | null | undefined)[]) {
  const storage = getStorage();
  const keys = urls.flatMap((url) => {
    const key = url ? storage.keyFromUrl(url) : null;
    return key && belongsToStore(key, storeId) ? [key] : [];
  });
  try {
    await enqueueStorageDelete(keys);
  } catch (err) {
    logger.warn({ err, keys }, "storage delete enqueue failed");
  }
}

/** Prisma unique-constraint violation (P2002) */
export const isUniqueViolation = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";

/**
 * The model whose unique constraint failed. With the pg driver adapter Prisma reports it as
 * meta.modelName (meta.target is not set).
 */
export const uniqueViolationModel = (err: unknown) =>
  (err as { meta?: { modelName?: string } }).meta?.modelName;
