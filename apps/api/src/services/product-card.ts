import type { Prisma } from "@primegear/db";
import type { ProductCard } from "@primegear/shared";

/** What the list/search/related cards need. Kept in one place so every card has the same shape. */
export const cardInclude = {
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: { id: true, sku: true, price: true, comparePrice: true, stock: true },
    orderBy: { price: "asc" },
  },
  images: {
    where: { kind: "STANDARD" },
    select: { url: true },
    orderBy: { sortOrder: "asc" },
    take: 1,
  },
} as const satisfies Prisma.ProductInclude;

export type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toProductCard(p: CardProduct): ProductCard {
  const cheapest = p.variants[0]; // ordered by price asc
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    isFeatured: p.isFeatured,
    price: cheapest?.price ?? 0,
    comparePrice:
      cheapest?.comparePrice && cheapest.comparePrice > cheapest.price
        ? cheapest.comparePrice
        : null,
    inStock: p.variants.some((v) => v.stock > 0),
    quickAddVariantId:
      p.variants.length === 1 && cheapest && cheapest.stock > 0 ? cheapest.id : null,
    imageUrl: p.images[0]?.url ?? null,
    category: p.category,
    brand: p.brand,
  };
}
