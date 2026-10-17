import type { Prisma } from "@primegear/db";
import type { AdminUpsellRule } from "@primegear/shared";
import type { z } from "zod";
import type { upsellRuleInputSchema } from "@primegear/shared";
import { AppError } from "../../lib/app-error";
import { audit, type Actor } from "../../lib/audit";
import { getPrisma } from "../../lib/prisma";
import { afterCatalogWrite } from "./catalog-effects";

type Input = z.output<typeof upsellRuleInputSchema>;

const include = {
  offerProduct: {
    select: {
      id: true,
      name: true,
      images: {
        where: { kind: "STANDARD" },
        select: { url: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
      variants: { where: { isActive: true }, select: { price: true }, orderBy: { price: "asc" }, take: 1 },
    },
  },
} as const satisfies Prisma.UpsellRuleInclude;

type Row = Prisma.UpsellRuleGetPayload<{ include: typeof include }>;

const toRule = (r: Row): AdminUpsellRule => ({
  id: r.id,
  type: r.type,
  name: r.name,
  triggerProductId: r.triggerProductId,
  triggerCategoryId: r.triggerCategoryId,
  offerProduct: {
    id: r.offerProduct.id,
    name: r.offerProduct.name,
    imageUrl: r.offerProduct.images[0]?.url ?? null,
    price: r.offerProduct.variants[0]?.price ?? 0,
  },
  discountType: r.discountType,
  discountValue: r.discountValue,
  priority: r.priority,
  isActive: r.isActive,
});

export async function listUpsellRules(storeId: string, triggerProductId?: string) {
  const rows = await getPrisma().upsellRule.findMany({
    where: { storeId, ...(triggerProductId && { triggerProductId }) },
    include,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(toRule);
}

async function checkRefs(tx: Prisma.TransactionClient, storeId: string, input: Input) {
  const productIds = [input.offerProductId, input.triggerProductId].filter((v): v is string => !!v);
  const products = await tx.product.count({ where: { storeId, id: { in: productIds } } });
  if (products !== productIds.length) throw AppError.badRequest("Unknown product", "PRODUCT_NOT_FOUND");
  if (input.triggerCategoryId) {
    const found = await tx.category.count({ where: { storeId, id: input.triggerCategoryId } });
    if (!found) throw AppError.badRequest("Unknown category", "CATEGORY_NOT_FOUND");
  }
}

export async function saveUpsellRule(actor: Actor, id: string | null, input: Input) {
  const rule = await getPrisma().$transaction(async (tx) => {
    await checkRefs(tx, actor.storeId, input);
    const before = id ? await tx.upsellRule.findFirst({ where: { id, storeId: actor.storeId } }) : null;
    if (id && !before) throw AppError.notFound("Upsell rule not found", "UPSELL_NOT_FOUND");
    const saved = id
      ? await tx.upsellRule.update({ where: { id }, data: input, include })
      : await tx.upsellRule.create({ data: { ...input, storeId: actor.storeId }, include });
    await audit(tx, actor, {
      action: id ? "upsell.update" : "upsell.create",
      entity: "UpsellRule",
      entityId: saved.id,
      before,
      after: { ...saved, offerProduct: undefined },
    });
    return saved;
  });
  await afterCatalogWrite(actor.storeId);
  return toRule(rule);
}

export async function deleteUpsellRule(actor: Actor, id: string) {
  await getPrisma().$transaction(async (tx) => {
    const before = await tx.upsellRule.findFirst({ where: { id, storeId: actor.storeId } });
    if (!before) throw AppError.notFound("Upsell rule not found", "UPSELL_NOT_FOUND");
    await tx.upsellRule.delete({ where: { id } });
    await audit(tx, actor, { action: "upsell.delete", entity: "UpsellRule", entityId: id, before });
  });
  await afterCatalogWrite(actor.storeId);
}
