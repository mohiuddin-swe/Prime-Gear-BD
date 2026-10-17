import type { Prisma } from "@primegear/db";
import {
  boxContentsSchema,
  lightModesSchema,
  productFeaturesSchema,
  productSpecsSchema,
  slugify,
  type AdminProduct,
  type AdminProductListQuery,
  type AdminProductRow,
  type ProductInputParsed,
} from "@primegear/shared";
import type { z } from "zod";
import { AppError } from "../../lib/app-error";
import { audit, type Actor } from "../../lib/audit";
import { getPrisma } from "../../lib/prisma";
import {
  afterCatalogWrite,
  deleteStoredFiles,
  isUniqueViolation,
  uniqueViolationModel,
} from "./catalog-effects";

const detailInclude = {
  variants: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { attributes: { include: { attributeValue: { include: { attribute: true } } } } },
  },
  bulkTiers: { orderBy: [{ variantId: "asc" }, { minQty: "asc" }] },
  images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
} as const satisfies Prisma.ProductInclude;

type DetailRow = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

const content = <T extends z.ZodType>(schema: T, value: unknown): z.infer<T> | [] => {
  const parsed = schema.safeParse(value ?? []);
  return parsed.success ? parsed.data : [];
};

function toAdminProduct(p: DetailRow): AdminProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status,
    categoryId: p.categoryId,
    brandId: p.brandId,
    subtitle: p.subtitle,
    shortDescription: p.shortDescription,
    description: p.description,
    isFeatured: p.isFeatured,
    tags: p.tags,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    features: content(productFeaturesSchema, p.features),
    boxContents: content(boxContentsSchema, p.boxContents),
    lightModes: content(lightModesSchema, p.lightModes),
    specs: content(productSpecsSchema, p.specs),
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      comparePrice: v.comparePrice,
      stock: v.stock,
      isDefault: v.isDefault,
      isActive: v.isActive,
      attributes: v.attributes.map((a) => ({
        attribute: a.attributeValue.attribute.name,
        value: a.attributeValue.value,
      })),
    })),
    bulkTiers: p.bulkTiers.map(({ id, variantId, minQty, unitPrice, label }) => ({
      id,
      variantId,
      minQty,
      unitPrice,
      label,
    })),
    images: p.images.map(({ id, url, alt, kind, variantId, sortOrder }) => ({
      id,
      url,
      alt,
      kind,
      variantId,
      sortOrder,
    })),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function listAdminProducts(storeId: string, q: AdminProductListQuery) {
  const prisma = getPrisma();
  const where: Prisma.ProductWhereInput = { storeId };
  if (q.status) where.status = q.status;
  if (q.q) {
    const contains = { contains: q.q, mode: "insensitive" } as const;
    where.OR = [{ name: contains }, { slug: contains }, { variants: { some: { sku: contains } } }];
  }
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        variants: { select: { price: true, stock: true, isActive: true } },
        images: {
          where: { kind: "STANDARD" },
          select: { url: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  const items: AdminProductRow[] = rows.map((p) => {
    const active = p.variants.filter((v) => v.isActive);
    const priced = active.length ? active : p.variants;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      imageUrl: p.images[0]?.url ?? null,
      category: p.category?.name ?? null,
      brand: p.brand?.name ?? null,
      price: priced.length ? Math.min(...priced.map((v) => v.price)) : 0,
      stock: active.reduce((sum, v) => sum + v.stock, 0),
      variantCount: p.variants.length,
      updatedAt: p.updatedAt.toISOString(),
    };
  });
  return { items, total };
}

async function loadProduct(db: Pick<Prisma.TransactionClient, "product">, storeId: string, id: string) {
  const product = await db.product.findFirst({ where: { id, storeId }, include: detailInclude });
  if (!product) throw AppError.notFound("Product not found", "PRODUCT_NOT_FOUND");
  return product;
}

export async function getAdminProduct(storeId: string, id: string) {
  return toAdminProduct(await loadProduct(getPrisma(), storeId, id));
}

/** Category and brand must belong to the store (ids come from the browser). */
async function checkRefs(tx: Prisma.TransactionClient, storeId: string, input: ProductInputParsed) {
  if (input.categoryId) {
    const found = await tx.category.count({ where: { id: input.categoryId, storeId } });
    if (!found) throw AppError.badRequest("Unknown category", "CATEGORY_NOT_FOUND");
  }
  if (input.brandId) {
    const found = await tx.brand.count({ where: { id: input.brandId, storeId } });
    if (!found) throw AppError.badRequest("Unknown brand", "BRAND_NOT_FOUND");
  }
}

/** Finds or creates Attribute ("Color") and AttributeValue ("Warm White") rows for a variant's options. */
async function attributeValueIds(
  tx: Prisma.TransactionClient,
  storeId: string,
  pairs: { attribute: string; value: string }[],
) {
  const ids: string[] = [];
  for (const pair of pairs) {
    const slug = slugify(pair.attribute) || "attribute";
    const attribute = await tx.attribute.upsert({
      where: { storeId_slug: { storeId, slug } },
      create: { storeId, name: pair.attribute, slug },
      update: {},
    });
    const value = await tx.attributeValue.upsert({
      where: { attributeId_value: { attributeId: attribute.id, value: pair.value } },
      create: { storeId, attributeId: attribute.id, value: pair.value },
      update: {},
    });
    ids.push(value.id);
  }
  return [...new Set(ids)];
}

const productData = (input: ProductInputParsed) => ({
  name: input.name,
  slug: input.slug,
  status: input.status,
  categoryId: input.categoryId,
  brandId: input.brandId,
  shortDescription: input.shortDescription,
  description: input.description,
  isFeatured: input.isFeatured,
  tags: [...new Set(input.tags)],
  seoTitle: input.seoTitle,
  seoDescription: input.seoDescription,
  // Content fields: omitted = unchanged; "" / [] clears
  ...(input.subtitle !== undefined && { subtitle: input.subtitle || null }),
  ...(input.features !== undefined && { features: input.features }),
  ...(input.boxContents !== undefined && { boxContents: input.boxContents }),
  ...(input.lightModes !== undefined && { lightModes: input.lightModes }),
  ...(input.specs !== undefined && { specs: input.specs }),
});

/**
 * Creates (id = null) or updates a product with its variants, variant attributes and bulk tiers in
 * one transaction, plus one AuditLog row with before/after.
 */
export async function saveProduct(actor: Actor, id: string | null, input: ProductInputParsed) {
  const { storeId } = actor;
  try {
    const saved = await getPrisma().$transaction(
      async (tx) => {
        await checkRefs(tx, storeId, input);
        const before = id ? toAdminProduct(await loadProduct(tx, storeId, id)) : null;

        const product = id
          ? await tx.product.update({ where: { id }, data: productData(input) })
          : await tx.product.create({ data: { storeId, ...productData(input) } });

        // Variants: ids must be this product's; any existing variant missing from the form is removed
        const keepIds = input.variants.flatMap((v) => (v.id ? [v.id] : []));
        if (before) {
          const own = new Set(before.variants.map((v) => v.id));
          if (keepIds.some((v) => !own.has(v))) {
            throw AppError.badRequest("Variant does not belong to this product", "VARIANT_NOT_FOUND");
          }
          await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keepIds } } });
        } else if (keepIds.length) {
          throw AppError.badRequest("A new product has no existing variants", "VARIANT_NOT_FOUND");
        }

        const hasDefault = input.variants.some((v) => v.isDefault);
        const variantIds: string[] = [];
        for (const [i, v] of input.variants.entries()) {
          const data = {
            name: v.name,
            sku: v.sku,
            price: v.price,
            comparePrice: v.comparePrice,
            stock: v.stock,
            isActive: v.isActive,
            isDefault: hasDefault ? v.isDefault : i === 0,
            sortOrder: i,
          };
          const variant = v.id
            ? await tx.productVariant.update({ where: { id: v.id }, data })
            : await tx.productVariant.create({ data: { ...data, storeId, productId: product.id } });
          variantIds.push(variant.id);

          const valueIds = await attributeValueIds(tx, storeId, v.attributes);
          await tx.variantAttributeValue.deleteMany({ where: { variantId: variant.id } });
          if (valueIds.length) {
            await tx.variantAttributeValue.createMany({
              data: valueIds.map((attributeValueId) => ({ storeId, variantId: variant.id, attributeValueId })),
            });
          }
        }

        // Bulk tiers are small and positional: replace them all
        await tx.bulkTier.deleteMany({ where: { productId: product.id } });
        if (input.bulkTiers.length) {
          await tx.bulkTier.createMany({
            data: input.bulkTiers.map((t) => ({
              storeId,
              productId: product.id,
              variantId: t.variantIndex === null ? null : variantIds[t.variantIndex]!,
              minQty: t.minQty,
              unitPrice: t.unitPrice,
              label: t.label,
            })),
          });
        }

        const after = toAdminProduct(await loadProduct(tx, storeId, product.id));
        await audit(tx, actor, {
          action: id ? "product.update" : "product.create",
          entity: "Product",
          entityId: product.id,
          before,
          after,
        });
        return after;
      },
      { timeout: 20_000 },
    );
    await afterCatalogWrite(storeId, [saved.id]);
    return saved;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw uniqueViolationModel(err) === "ProductVariant"
        ? new AppError(409, "SKU_TAKEN", "A variant SKU is already used by another product")
        : new AppError(409, "SLUG_TAKEN", "Another product already uses this URL slug");
    }
    throw err;
  }
}

/** Deletes the product (variants, tiers, images cascade). Past orders keep their snapshots. */
export async function deleteProduct(actor: Actor, id: string) {
  const before = await getPrisma().$transaction(async (tx) => {
    const product = toAdminProduct(await loadProduct(tx, actor.storeId, id));
    await tx.product.delete({ where: { id } });
    await audit(tx, actor, { action: "product.delete", entity: "Product", entityId: id, before: product });
    return product;
  });
  await deleteStoredFiles(actor.storeId, before.images.map((i) => i.url));
  await afterCatalogWrite(actor.storeId, [id]);
}
