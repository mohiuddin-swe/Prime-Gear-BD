import { env } from "../config/env";
import { AppError } from "./app-error";

/** Minimal Meilisearch REST client (fetch only, no extra dependency). */
export const PRODUCTS_INDEX = "products";

async function meili<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.MEILI_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(env.MEILI_MASTER_KEY ? { authorization: `Bearer ${env.MEILI_MASTER_KEY}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new AppError(503, "SEARCH_UNAVAILABLE", "Search is temporarily unavailable");
  }
  if (res.status === 404 && path.startsWith(`/indexes/${PRODUCTS_INDEX}`)) {
    throw new AppError(502, "SEARCH_INDEX_MISSING", "Search index does not exist");
  }
  if (!res.ok) {
    throw new AppError(
      res.status >= 500 ? 503 : 502,
      "SEARCH_ERROR",
      `Meilisearch ${init.method ?? "GET"} ${path} failed (${res.status})`,
    );
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export type MeiliTask = { taskUid: number };

export const SEARCH_SETTINGS = {
  searchableAttributes: ["name", "brandName", "categoryName", "tags", "skus", "shortDescription"],
  filterableAttributes: ["storeId"],
  sortableAttributes: ["price"],
};

export const configureProductsIndex = () =>
  meili<MeiliTask>(`/indexes/${PRODUCTS_INDEX}/settings`, {
    method: "PATCH",
    body: SEARCH_SETTINGS,
  });

/** Creates the products index with its settings if it is missing. Returns true when it created it. */
export async function ensureProductsIndex() {
  try {
    await meili(`/indexes/${PRODUCTS_INDEX}`);
    return false;
  } catch (err) {
    if (!(err instanceof AppError) || err.code !== "SEARCH_INDEX_MISSING") throw err;
  }
  await meili("/indexes", { method: "POST", body: { uid: PRODUCTS_INDEX, primaryKey: "id" } });
  await configureProductsIndex();
  return true;
}

export const upsertDocuments = (docs: object[]) =>
  meili<MeiliTask>(`/indexes/${PRODUCTS_INDEX}/documents`, { method: "POST", body: docs });

export const deleteDocument = (id: string) =>
  meili<MeiliTask>(`/indexes/${PRODUCTS_INDEX}/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

export const deleteAllDocuments = () =>
  meili<MeiliTask>(`/indexes/${PRODUCTS_INDEX}/documents`, { method: "DELETE" });

export type MeiliSearchResult<T> = { hits: T[]; estimatedTotalHits: number };

export const searchIndex = <T>(body: {
  q: string;
  filter: string;
  offset: number;
  limit: number;
}) => meili<MeiliSearchResult<T>>(`/indexes/${PRODUCTS_INDEX}/search`, { method: "POST", body });
