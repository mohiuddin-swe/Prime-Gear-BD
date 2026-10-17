import type { Prisma } from "@primegear/db";
import type {
  AdminBrand,
  AdminCatalogOptions,
  AdminCategory,
  AdminSearchQuery,
  brandInputSchema,
  categoryInputSchema,
} from "@primegear/shared";
import type { z } from "zod";
import { AppError } from "../../lib/app-error";
import { audit, type Actor } from "../../lib/audit";
import { getPrisma } from "../../lib/prisma";
import { afterCatalogWrite, deleteStoredFiles, isUniqueViolation } from "./catalog-effects";

// Categories and brands. Their names are in every product's search document, so a rename resyncs
// the products that use them.

type CategoryInput = z.output<typeof categoryInputSchema>;
type BrandInput = z.output<typeof brandInputSchema>;

const slugTaken = (what: string) =>
  new AppError(409, "SLUG_TAKEN", `Another ${what} already uses this URL slug`);

const nameFilter = (q?: string) =>
  q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

async function productIdsWhere(tx: Prisma.TransactionClient, where: Prisma.ProductWhereInput) {
  return (await tx.product.findMany({ where, select: { id: true } })).map((p) => p.id);
}

// ───────────── Categories ─────────────

const categoryInclude = {
  parent: { select: { name: true } },
  _count: { select: { products: true } },
} as const satisfies Prisma.CategoryInclude;

const toCategory = (c: Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>): AdminCategory => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  parentId: c.parentId,
  parentName: c.parent?.name ?? null,
  description: c.description,
  imageUrl: c.imageUrl,
  sortOrder: c.sortOrder,
  isActive: c.isActive,
  seoTitle: c.seoTitle,
  seoDescription: c.seoDescription,
  productCount: c._count.products,
});

export async function listCategories(storeId: string, q: AdminSearchQuery) {
  const prisma = getPrisma();
  const where = { storeId, ...nameFilter(q.q) };
  const [total, rows] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      include: categoryInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  return { items: rows.map(toCategory), total };
}

/** The parent must be in the store and must not be the category itself or one of its descendants. */
async function checkParent(tx: Prisma.TransactionClient, storeId: string, id: string | null, parentId: string | null) {
  if (!parentId) return;
  const rows = await tx.category.findMany({ where: { storeId }, select: { id: true, parentId: true } });
  const byId = new Map(rows.map((r) => [r.id, r.parentId]));
  if (!byId.has(parentId)) throw AppError.badRequest("Unknown parent category", "CATEGORY_NOT_FOUND");
  for (let p: string | null | undefined = parentId; p; p = byId.get(p)) {
    if (p === id) throw AppError.badRequest("A category can't be inside itself", "CATEGORY_CYCLE");
  }
}

export async function saveCategory(actor: Actor, id: string | null, input: CategoryInput) {
  const { storeId } = actor;
  let productIds: string[] = [];
  let replacedImage: string | null = null;
  try {
    const saved = await getPrisma().$transaction(async (tx) => {
      const before = id ? await tx.category.findFirst({ where: { id, storeId } }) : null;
      if (id && !before) throw AppError.notFound("Category not found", "CATEGORY_NOT_FOUND");
      await checkParent(tx, storeId, id, input.parentId);
      const category = id
        ? await tx.category.update({ where: { id }, data: input, include: categoryInclude })
        : await tx.category.create({ data: { ...input, storeId }, include: categoryInclude });
      await audit(tx, actor, {
        action: id ? "category.update" : "category.create",
        entity: "Category",
        entityId: category.id,
        before,
        after: { ...category, parent: undefined, _count: undefined },
      });
      if (before && before.name !== category.name) {
        productIds = await productIdsWhere(tx, { storeId, categoryId: category.id });
      }
      if (before?.imageUrl && before.imageUrl !== category.imageUrl) replacedImage = before.imageUrl;
      return category;
    });
    await deleteStoredFiles(storeId, [replacedImage]);
    await afterCatalogWrite(storeId, productIds);
    return toCategory(saved);
  } catch (err) {
    if (isUniqueViolation(err)) throw slugTaken("category");
    throw err;
  }
}

/** Sub-categories move to the top level and products become uncategorised (schema: SetNull). */
export async function deleteCategory(actor: Actor, id: string) {
  const { storeId } = actor;
  const { before, productIds } = await getPrisma().$transaction(async (tx) => {
    const before = await tx.category.findFirst({ where: { id, storeId } });
    if (!before) throw AppError.notFound("Category not found", "CATEGORY_NOT_FOUND");
    const productIds = await productIdsWhere(tx, { storeId, categoryId: id });
    await tx.category.delete({ where: { id } });
    await audit(tx, actor, { action: "category.delete", entity: "Category", entityId: id, before });
    return { before, productIds };
  });
  await deleteStoredFiles(storeId, [before.imageUrl]);
  await afterCatalogWrite(storeId, productIds);
}

// ───────────── Brands ─────────────

const brandInclude = { _count: { select: { products: true } } } as const satisfies Prisma.BrandInclude;

const toBrand = (b: Prisma.BrandGetPayload<{ include: typeof brandInclude }>): AdminBrand => ({
  id: b.id,
  name: b.name,
  slug: b.slug,
  logoUrl: b.logoUrl,
  productCount: b._count.products,
});

export async function listBrands(storeId: string, q: AdminSearchQuery) {
  const prisma = getPrisma();
  const where = { storeId, ...nameFilter(q.q) };
  const [total, rows] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.findMany({
      where,
      include: brandInclude,
      orderBy: { name: "asc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  return { items: rows.map(toBrand), total };
}

export async function saveBrand(actor: Actor, id: string | null, input: BrandInput) {
  const { storeId } = actor;
  let productIds: string[] = [];
  let replacedLogo: string | null = null;
  try {
    const saved = await getPrisma().$transaction(async (tx) => {
      const before = id ? await tx.brand.findFirst({ where: { id, storeId } }) : null;
      if (id && !before) throw AppError.notFound("Brand not found", "BRAND_NOT_FOUND");
      const brand = id
        ? await tx.brand.update({ where: { id }, data: input, include: brandInclude })
        : await tx.brand.create({ data: { ...input, storeId }, include: brandInclude });
      await audit(tx, actor, {
        action: id ? "brand.update" : "brand.create",
        entity: "Brand",
        entityId: brand.id,
        before,
        after: { ...brand, _count: undefined },
      });
      if (before && before.name !== brand.name) {
        productIds = await productIdsWhere(tx, { storeId, brandId: brand.id });
      }
      if (before?.logoUrl && before.logoUrl !== brand.logoUrl) replacedLogo = before.logoUrl;
      return brand;
    });
    await deleteStoredFiles(storeId, [replacedLogo]);
    await afterCatalogWrite(storeId, productIds);
    return toBrand(saved);
  } catch (err) {
    if (isUniqueViolation(err)) throw slugTaken("brand");
    throw err;
  }
}

export async function deleteBrand(actor: Actor, id: string) {
  const { storeId } = actor;
  const { before, productIds } = await getPrisma().$transaction(async (tx) => {
    const before = await tx.brand.findFirst({ where: { id, storeId } });
    if (!before) throw AppError.notFound("Brand not found", "BRAND_NOT_FOUND");
    const productIds = await productIdsWhere(tx, { storeId, brandId: id });
    await tx.brand.delete({ where: { id } });
    await audit(tx, actor, { action: "brand.delete", entity: "Brand", entityId: id, before });
    return { before, productIds };
  });
  await deleteStoredFiles(storeId, [before.logoUrl]);
  await afterCatalogWrite(storeId, productIds);
}

// ───────────── Form options ─────────────

export async function getCatalogOptions(storeId: string): Promise<AdminCatalogOptions> {
  const prisma = getPrisma();
  const [categories, brands, attributes] = await Promise.all([
    prisma.category.findMany({
      where: { storeId },
      select: { id: true, name: true, parentId: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({ where: { storeId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.attribute.findMany({
      where: { storeId },
      select: { name: true, values: { select: { value: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  return {
    categories,
    brands,
    attributes: attributes.map((a) => ({ name: a.name, values: a.values.map((v) => v.value) })),
  };
}
