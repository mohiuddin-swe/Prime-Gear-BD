import type { Prisma } from "@primegear/db";
import type { ProductCard, ProductDetail, ProductListQuery } from "@primegear/shared";
import { AppError } from "../lib/app-error";
import { cached } from "../lib/cache";
import { getPrisma } from "../lib/prisma";
import { descendantIds, loadActiveCategories } from "./category.service";
import { cardInclude, toProductCard } from "./product-card";

const RELATED_LIMIT = 8;
// Orders in these statuses never count towards "bestselling"
const NOT_SOLD = ["CANCELLED", "RETURNED"] as const;

/** Filters shared by every sort. Price and stock must match the SAME active variant. */
export async function buildProductWhere(
  storeId: string,
  q: Pick<ProductListQuery, "category" | "brand" | "minPrice" | "maxPrice" | "inStock">,
): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = { storeId, status: "ACTIVE" };

  if (q.category) {
    const rows = await loadActiveCategories(storeId);
    const root = rows.find((r) => r.slug === q.category);
    // Unknown category matches nothing rather than silently returning everything
    where.categoryId = { in: root ? descendantIds(rows, root.id) : [] };
  }
  if (q.brand) where.brand = { slug: q.brand };

  const variant: Prisma.ProductVariantWhereInput = { isActive: true };
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    variant.price = { gte: q.minPrice, lte: q.maxPrice };
  }
  if (q.inStock) variant.stock = { gt: 0 };
  where.variants = { some: variant };
  return where;
}

/** price and bestselling can't be expressed as a Prisma orderBy (they derive from relations), so rank ids in memory. */
async function rankIds(
  storeId: string,
  where: Prisma.ProductWhereInput,
  sort: ProductListQuery["sort"],
) {
  const prisma = getPrisma();
  const rows = await prisma.product.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      variants: { where: { isActive: true }, select: { price: true } },
    },
  });
  const minPrice = new Map(rows.map((r) => [r.id, Math.min(...r.variants.map((v) => v.price))]));

  let sold = new Map<string, number>();
  if (sort === "bestselling") {
    const grouped = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        storeId,
        productId: { in: rows.map((r) => r.id) },
        order: { status: { notIn: [...NOT_SOLD] } },
      },
      _sum: { quantity: true },
    });
    sold = new Map(
      grouped.flatMap((g) => (g.productId ? [[g.productId, g._sum.quantity ?? 0] as const] : [])),
    );
  }

  const newestFirst = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);
  const primary = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
    if (sort === "price_asc") return minPrice.get(a.id)! - minPrice.get(b.id)!;
    if (sort === "price_desc") return minPrice.get(b.id)! - minPrice.get(a.id)!;
    return (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0);
  };
  return rows.sort((a, b) => primary(a, b) || newestFirst(a, b)).map((r) => r.id);
}

export async function listProducts(storeId: string, q: ProductListQuery) {
  const key = `products:${JSON.stringify([q.category, q.brand, q.minPrice, q.maxPrice, q.inStock, q.sort, q.page, q.limit])}`;
  return cached(storeId, key, async () => {
    const prisma = getPrisma();
    const where = await buildProductWhere(storeId, q);
    const skip = (q.page - 1) * q.limit;

    if (q.sort === "newest") {
      const [total, items] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          include: cardInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip,
          take: q.limit,
        }),
      ]);
      return { items: items.map(toProductCard), total };
    }

    const ranked = await rankIds(storeId, where, q.sort);
    const pageIds = ranked.slice(skip, skip + q.limit);
    const items = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      include: cardInclude,
    });
    const byId = new Map(items.map((p) => [p.id, p]));
    return {
      items: pageIds.flatMap((id) => (byId.has(id) ? [toProductCard(byId.get(id)!)] : [])),
      total: ranked.length,
    };
  });
}

export function getProductBySlug(storeId: string, slug: string) {
  return cached<ProductDetail>(storeId, `product:${slug}`, async () => {
    const prisma = getPrisma();
    const product = await prisma.product.findFirst({
      where: { storeId, slug, status: "ACTIVE" },
      include: {
        ...cardInclude,
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
          include: {
            attributes: { include: { attributeValue: { include: { attribute: true } } } },
          },
        },
        images: { orderBy: { sortOrder: "asc" } },
        bulkTiers: { orderBy: { minQty: "asc" } },
      },
    });
    if (!product) throw AppError.notFound("Product not found", "PRODUCT_NOT_FOUND");

    const related: ProductCard[] = product.categoryId
      ? (
          await prisma.product.findMany({
            where: {
              storeId,
              status: "ACTIVE",
              categoryId: product.categoryId,
              id: { not: product.id },
              variants: { some: { isActive: true } },
            },
            include: cardInclude,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: RELATED_LIMIT,
          })
        ).map(toProductCard)
      : [];

    // Card fields come from the cheapest variant, so compute them before sorting variants for display
    const byPrice = [...product.variants].sort((a, b) => a.price - b.price);
    const card = toProductCard({ ...product, variants: byPrice });
    return {
      ...card,
      description: product.description,
      tags: product.tags,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        comparePrice: v.comparePrice,
        stock: v.stock,
        isDefault: v.isDefault,
        attributes: v.attributes.map((a) => ({
          attribute: a.attributeValue.attribute.name,
          value: a.attributeValue.value,
          swatch: a.attributeValue.swatch,
        })),
      })),
      images: product.images.map(({ id, url, alt, kind, variantId }) => ({
        id,
        url,
        alt,
        kind,
        variantId,
      })),
      bulkTiers: product.bulkTiers.map(({ id, variantId, minQty, unitPrice, label }) => ({
        id,
        variantId,
        minQty,
        unitPrice,
        label,
      })),
      relatedProducts: related,
    };
  });
}
