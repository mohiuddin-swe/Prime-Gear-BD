import type { Prisma } from "@primegear/db";
import type { ProductCard, SearchQuery } from "@primegear/shared";
import { AppError } from "../lib/app-error";
import { logger } from "../lib/logger";
import {
  configureProductsIndex,
  deleteAllDocuments,
  deleteDocument,
  ensureProductsIndex,
  searchIndex,
  upsertDocuments,
} from "../lib/meili";
import { getPrisma } from "../lib/prisma";
import { cardInclude, toProductCard, type CardProduct } from "./product-card";

type SearchDoc = ProductCard & {
  storeId: string;
  categoryName: string | null;
  brandName: string | null;
  tags: string[];
  skus: string[];
};

const BATCH = 500;

function toDoc(storeId: string, p: CardProduct): SearchDoc {
  return {
    ...toProductCard(p),
    storeId,
    categoryName: p.category?.name ?? null,
    brandName: p.brand?.name ?? null,
    tags: p.tags,
    skus: p.variants.map((v) => v.sku),
  };
}

const isSearchable = (p: CardProduct) => p.status === "ACTIVE" && p.variants.length > 0;

/** Make the index match the DB for one product: upsert when it's sellable, remove otherwise. */
export async function syncProduct(productId: string) {
  const product = await getPrisma().product.findUnique({
    where: { id: productId },
    include: cardInclude,
  });
  if (!product || !isSearchable(product)) {
    await deleteDocument(productId);
    return "deleted" as const;
  }
  await upsertDocuments([toDoc(product.storeId, product)]);
  return "indexed" as const;
}

/** Drops the index contents and rebuilds from Postgres. Returns the number of documents indexed. */
export async function reindexAll() {
  await ensureProductsIndex();
  await configureProductsIndex(); // keep settings current even when the index already existed
  await deleteAllDocuments();
  const prisma = getPrisma();
  let cursor: string | undefined;
  let count = 0;
  for (;;) {
    const batch = await prisma.product.findMany({
      where: { status: "ACTIVE", variants: { some: { isActive: true } } },
      include: cardInclude,
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (batch.length === 0) break;
    await upsertDocuments(batch.map((p) => toDoc(p.storeId, p)));
    count += batch.length;
    cursor = batch[batch.length - 1]!.id;
  }
  return count;
}

/** Postgres ILIKE search, used when Meilisearch is down or its index is missing. */
async function searchProductsFallback(storeId: string, q: SearchQuery) {
  const prisma = getPrisma();
  const contains = { contains: q.q, mode: "insensitive" } as const;
  const where: Prisma.ProductWhereInput = {
    storeId,
    status: "ACTIVE",
    variants: { some: { isActive: true } },
    OR: [
      { name: contains },
      { shortDescription: contains },
      { brand: { name: contains } },
      { category: { name: contains } },
      { tags: { has: q.q.toLowerCase() } },
      { variants: { some: { sku: contains } } },
    ],
  };
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  return { items: rows.map(toProductCard), total };
}

export async function searchProducts(storeId: string, q: SearchQuery) {
  try {
    return await searchMeili(storeId, q);
  } catch (err) {
    if (!(err instanceof AppError) || !err.code.startsWith("SEARCH_")) throw err;
    logger.warn({ code: err.code, err: err.message }, "Meilisearch failed, using Postgres search");
    return searchProductsFallback(storeId, q);
  }
}

async function searchMeili(storeId: string, q: SearchQuery) {
  const res = await searchIndex<SearchDoc>({
    q: q.q,
    filter: `storeId = "${storeId}"`,
    offset: (q.page - 1) * q.limit,
    limit: q.limit,
  });
  // Documents carry search-only fields (storeId, skus, ...); the API returns just the card
  const items: ProductCard[] = res.hits.map((h) => ({
    id: h.id,
    name: h.name,
    slug: h.slug,
    shortDescription: h.shortDescription,
    isFeatured: h.isFeatured,
    price: h.price,
    comparePrice: h.comparePrice,
    inStock: h.inStock,
    // Documents indexed before the field existed lack it until the next reindex
    quickAddVariantId: h.quickAddVariantId ?? null,
    imageUrl: h.imageUrl,
    category: h.category,
    brand: h.brand,
  }));
  return { items, total: res.estimatedTotalHits };
}
