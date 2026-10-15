import type { CategoryDetail, CategoryNode } from "@primegear/shared";
import { AppError } from "../lib/app-error";
import { cached } from "../lib/cache";
import { getPrisma } from "../lib/prisma";

type Row = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export function loadActiveCategories(storeId: string): Promise<Row[]> {
  return getPrisma().category.findMany({
    where: { storeId, isActive: true },
    select: { id: true, parentId: true, name: true, slug: true, imageUrl: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function buildCategoryTree(rows: Row[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(
    rows.map((r) => [
      r.id,
      { id: r.id, name: r.name, slug: r.slug, imageUrl: r.imageUrl, children: [] },
    ]),
  );
  const roots: CategoryNode[] = [];
  for (const r of rows) {
    const node = nodes.get(r.id)!;
    const parent = r.parentId ? nodes.get(r.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

/** The category's own id plus every descendant id (used by the product category filter). */
export function descendantIds(rows: Row[], rootId: string): string[] {
  const ids = [rootId];
  for (let i = 0; i < ids.length; i++) {
    for (const r of rows) if (r.parentId === ids[i]) ids.push(r.id);
  }
  return ids;
}

export function getCategoryTree(storeId: string) {
  return cached(storeId, "categories:tree", async () =>
    buildCategoryTree(await loadActiveCategories(storeId)),
  );
}

export function getCategoryBySlug(storeId: string, slug: string) {
  return cached<CategoryDetail>(storeId, `category:${slug}`, async () => {
    const category = await getPrisma().category.findFirst({
      where: { storeId, slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        seoTitle: true,
        seoDescription: true,
      },
    });
    if (!category) throw AppError.notFound("Category not found", "CATEGORY_NOT_FOUND");

    const rows = await loadActiveCategories(storeId);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ancestors: CategoryDetail["ancestors"] = [];
    for (let p = byId.get(category.id)?.parentId; p; p = byId.get(p)?.parentId) {
      const row = byId.get(p);
      if (!row) break;
      ancestors.unshift({ name: row.name, slug: row.slug });
    }
    return {
      ...category,
      ancestors,
      children: rows
        .filter((r) => r.parentId === category.id)
        .map(({ id, name, slug: s, imageUrl }) => ({ id, name, slug: s, imageUrl })),
    };
  });
}
