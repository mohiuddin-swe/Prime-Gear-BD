import { randomBytes } from "node:crypto";
import type { Prisma } from "@primegear/db";
import {
  MAX_QTY_PER_PRODUCT,
  type AddToCartInput,
  type CartLine,
  type CartView,
  type ShippingZone,
  type UpsellOffer,
} from "@primegear/shared";
import { AppError } from "../lib/app-error";
import { getPrisma } from "../lib/prisma";
import { priceCart, upsellUnitDiscount, type PricingItem } from "./pricing.service";
import { getStoreSettings } from "./settings.service";

/** A guest is identified by the cookie session id; a logged-in customer by their id. */
export type CartOwner = { sessionId?: string; customerId?: string };

const newSessionId = () => randomBytes(24).toString("base64url");

const activeCartWhere = (storeId: string, owner: CartOwner): Prisma.CartWhereInput | null =>
  owner.customerId
    ? { storeId, status: "ACTIVE", customerId: owner.customerId }
    : owner.sessionId
      ? { storeId, status: "ACTIVE", sessionId: owner.sessionId, customerId: null }
      : null;

export async function findActiveCart(storeId: string, owner: CartOwner) {
  const where = activeCartWhere(storeId, owner);
  return where ? getPrisma().cart.findFirst({ where, orderBy: { updatedAt: "desc" } }) : null;
}

const itemInclude = {
  product: {
    select: {
      name: true,
      slug: true,
      categoryId: true,
      images: {
        where: { kind: "STANDARD" },
        select: { url: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  },
  variant: { select: { name: true, sku: true, price: true, stock: true } },
  upsellRule: { select: { discountType: true, discountValue: true } },
} as const satisfies Prisma.CartItemInclude;

// ───────────── View ─────────────

type Db = Prisma.TransactionClient;

/** Loads a cart's sellable lines and prices them. Works with the plain client or inside a transaction. */
export async function loadPricedCart(db: Db, storeId: string, cartId: string, zone?: ShippingZone) {
  const settings = await getStoreSettings(storeId, db);
  const rows = await db.cartItem.findMany({
    where: { cartId, product: { status: "ACTIVE" }, variant: { isActive: true } },
    include: itemInclude,
    orderBy: { createdAt: "asc" },
  });
  const tiers = rows.length
    ? await db.bulkTier.findMany({
        where: { storeId, productId: { in: [...new Set(rows.map((r) => r.productId))] } },
        select: { productId: true, variantId: true, minQty: true, unitPrice: true },
      })
    : [];

  const items: PricingItem[] = rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    variantId: r.variantId,
    quantity: r.quantity,
    unitPrice: r.variant.price,
    upsell: r.upsellRule
      ? { type: r.upsellRule.discountType, value: r.upsellRule.discountValue }
      : null,
  }));
  const priced = priceCart({ items, tiers, settings, zone });
  return { rows, priced, settings };
}

export async function buildCartView(
  storeId: string,
  cartId: string | null,
  zone?: ShippingZone,
): Promise<CartView> {
  const { rows, priced, settings } = cartId
    ? await loadPricedCart(getPrisma(), storeId, cartId, zone)
    : {
        rows: [],
        priced: priceCart({
          items: [],
          tiers: [],
          settings: await getStoreSettings(storeId),
          zone,
        }),
        settings: await getStoreSettings(storeId),
      };
  const pricedById = new Map(priced.lines.map((l) => [l.id, l]));

  const lines: CartLine[] = rows.map((r) => ({
    productId: r.productId,
    variantId: r.variantId,
    slug: r.product.slug,
    name: r.product.name,
    variantName: r.variant.name === "Default" ? null : r.variant.name,
    sku: r.variant.sku,
    imageUrl: r.product.images[0]?.url ?? null,
    stock: r.variant.stock,
    upsellSource: r.upsellSource,
    ...pricedById.get(r.id)!,
  }));

  return {
    id: cartId,
    items: lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    pricing: {
      subtotal: priced.subtotal,
      discount: priced.discount,
      shippingFee: priced.shippingFee,
      total: priced.total,
    },
    freeDelivery: priced.freeDelivery,
    shipping: { insideDhaka: settings.insideDhakaFee, outsideDhaka: settings.outsideDhakaFee },
    deliveryEta: settings.deliveryEta,
    maxQtyPerProduct: MAX_QTY_PER_PRODUCT,
    whatsappNumber: settings.whatsappNumber,
  };
}

export async function getCart(storeId: string, owner: CartOwner, zone?: ShippingZone) {
  const cart = await findActiveCart(storeId, owner);
  return buildCartView(storeId, cart?.id ?? null, zone);
}

// ───────────── Rules shared by add / update ─────────────

export function assertQuantityAllowed(opts: {
  /** Units of the same product already in the cart on OTHER lines */
  otherLinesQty: number;
  newLineQty: number;
  stock: number;
}) {
  if (opts.stock <= 0) throw new AppError(409, "OUT_OF_STOCK", "This item is out of stock");
  if (opts.otherLinesQty + opts.newLineQty > MAX_QTY_PER_PRODUCT) {
    throw new AppError(
      409,
      "CART_LIMIT_EXCEEDED",
      `You can order up to ${MAX_QTY_PER_PRODUCT} of one product online. Contact us on WhatsApp for bulk orders.`,
    );
  }
  if (opts.newLineQty > opts.stock) {
    throw new AppError(409, "INSUFFICIENT_STOCK", `Only ${opts.stock} left in stock`);
  }
}

// ───────────── Mutations ─────────────

export async function addToCart(storeId: string, owner: CartOwner, input: AddToCartInput) {
  const prisma = getPrisma();

  const variant = await prisma.productVariant.findFirst({
    where: { id: input.variantId, storeId, isActive: true, product: { status: "ACTIVE" } },
    select: { id: true, productId: true, stock: true },
  });
  if (!variant) throw AppError.notFound("Product not found", "VARIANT_NOT_FOUND");

  let cart = await findActiveCart(storeId, owner);
  let sessionId = owner.sessionId;
  if (!cart) {
    sessionId ??= newSessionId();
    cart = await prisma.cart.create({
      data: { storeId, sessionId, customerId: owner.customerId ?? null },
    });
  }

  const existing = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    select: {
      id: true,
      variantId: true,
      productId: true,
      quantity: true,
      upsellRuleId: true,
      product: { select: { categoryId: true } },
    },
  });
  const sameLine = existing.find((e) => e.variantId === variant.id);
  assertQuantityAllowed({
    otherLinesQty: existing
      .filter((e) => e.productId === variant.productId && e.variantId !== variant.id)
      .reduce((n, e) => n + e.quantity, 0),
    newLineQty: (sameLine?.quantity ?? 0) + input.quantity,
    stock: variant.stock,
  });

  // An upsell discount is only valid for the rule's own offer product and while its trigger is in the cart
  let upsell: { ruleId: string; source: "BUY_TOGETHER" | "CART_UPSELL" } | undefined;
  if (input.upsellRuleId && !sameLine?.upsellRuleId) {
    const rule = await prisma.upsellRule.findFirst({
      where: {
        id: input.upsellRuleId,
        storeId,
        isActive: true,
        type: { in: ["CART_UPSELL", "BUY_TOGETHER"] },
        offerProductId: variant.productId,
      },
      select: { id: true, type: true, triggerProductId: true, triggerCategoryId: true },
    });
    const others = existing.filter((e) => e.productId !== variant.productId);
    const triggered =
      !!rule &&
      ((!rule.triggerProductId && !rule.triggerCategoryId) ||
        others.some(
          (e) =>
            e.productId === rule.triggerProductId ||
            (rule.triggerCategoryId && e.product.categoryId === rule.triggerCategoryId),
        ));
    if (!rule || !triggered) {
      throw AppError.badRequest("This offer is not available for your cart", "UPSELL_INVALID");
    }
    upsell = { ruleId: rule.id, source: rule.type as "BUY_TOGETHER" | "CART_UPSELL" };
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    create: {
      storeId,
      cartId: cart.id,
      productId: variant.productId,
      variantId: variant.id,
      quantity: input.quantity,
      upsellRuleId: upsell?.ruleId,
      upsellSource: upsell?.source,
    },
    update: {
      quantity: { increment: input.quantity },
      ...(upsell ? { upsellRuleId: upsell.ruleId, upsellSource: upsell.source } : {}),
    },
  });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

  return { sessionId: owner.customerId ? undefined : sessionId, cartId: cart.id };
}

async function findOwnedItem(storeId: string, owner: CartOwner, itemId: string) {
  const cart = await findActiveCart(storeId, owner);
  const item = cart
    ? await getPrisma().cartItem.findFirst({
        where: { id: itemId, cartId: cart.id },
        include: { variant: { select: { stock: true } } },
      })
    : null;
  if (!cart || !item) throw AppError.notFound("Cart item not found", "CART_ITEM_NOT_FOUND");
  return { cart, item };
}

export async function updateCartItem(
  storeId: string,
  owner: CartOwner,
  itemId: string,
  quantity: number,
) {
  const { cart, item } = await findOwnedItem(storeId, owner, itemId);
  const others = await getPrisma().cartItem.aggregate({
    where: { cartId: cart.id, productId: item.productId, id: { not: item.id } },
    _sum: { quantity: true },
  });
  assertQuantityAllowed({
    otherLinesQty: others._sum.quantity ?? 0,
    newLineQty: quantity,
    stock: item.variant.stock,
  });
  await getPrisma().cartItem.update({ where: { id: item.id }, data: { quantity } });
  return cart.id;
}

export async function removeCartItem(storeId: string, owner: CartOwner, itemId: string) {
  const { cart, item } = await findOwnedItem(storeId, owner, itemId);
  await getPrisma().cartItem.delete({ where: { id: item.id } });
  return cart.id;
}

// ───────────── Login merge ─────────────

/** Units to keep when the same variant exists in both carts: never beyond the product cap or stock. */
export function mergedQuantity(opts: {
  existing: number;
  incoming: number;
  /** Units of the same product on other lines of the destination cart */
  otherLinesQty: number;
  stock: number;
}) {
  const room = Math.max(0, MAX_QTY_PER_PRODUCT - opts.otherLinesQty);
  return Math.max(0, Math.min(opts.existing + opts.incoming, room, opts.stock));
}

/**
 * Call right after a customer logs in: folds their guest cart (cookie session) into their own cart.
 * Returns the surviving cart id, or null when there was nothing to merge.
 */
export async function mergeGuestCartIntoCustomer(
  storeId: string,
  sessionId: string,
  customerId: string,
) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const guest = await tx.cart.findFirst({
      where: { storeId, sessionId, status: "ACTIVE", customerId: null },
      include: { items: { include: { variant: { select: { stock: true } } } } },
    });
    if (!guest) return null;

    const mine = await tx.cart.findFirst({
      where: { storeId, customerId, status: "ACTIVE" },
      include: { items: true },
    });
    if (!mine) {
      // Nothing to merge into: the guest cart simply becomes theirs
      await tx.cart.update({ where: { id: guest.id }, data: { customerId } });
      return guest.id;
    }

    const lines = new Map(mine.items.map((i) => [i.variantId, { ...i }]));
    for (const g of guest.items) {
      const same = lines.get(g.variantId);
      const otherLinesQty = [...lines.values()]
        .filter((l) => l.productId === g.productId && l.variantId !== g.variantId)
        .reduce((n, l) => n + l.quantity, 0);
      const quantity = mergedQuantity({
        existing: same?.quantity ?? 0,
        incoming: g.quantity,
        otherLinesQty,
        stock: g.variant.stock,
      });
      if (quantity === 0) continue;
      if (same) {
        await tx.cartItem.update({ where: { id: same.id }, data: { quantity } });
        same.quantity = quantity;
      } else {
        const created = await tx.cartItem.create({
          data: {
            storeId,
            cartId: mine.id,
            productId: g.productId,
            variantId: g.variantId,
            quantity,
            upsellRuleId: g.upsellRuleId,
            upsellSource: g.upsellSource,
          },
        });
        lines.set(g.variantId, created);
      }
    }
    await tx.cart.delete({ where: { id: guest.id } });
    return mine.id;
  });
}

// ───────────── Upsell offers ─────────────

const MAX_OFFERS = 3;

/** Up to 3 CART_UPSELL offers for the product just added (trigger = that product or its category). */
export async function getUpsellOffers(
  storeId: string,
  owner: CartOwner,
  productId: string,
): Promise<UpsellOffer[]> {
  const prisma = getPrisma();
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
    select: { id: true, categoryId: true },
  });
  if (!product) return [];

  const cart = await findActiveCart(storeId, owner);
  const inCart = cart
    ? await prisma.cartItem.findMany({ where: { cartId: cart.id }, select: { productId: true } })
    : [];
  const inCartIds = new Set(inCart.map((i) => i.productId));

  const rules = await prisma.upsellRule.findMany({
    where: {
      storeId,
      isActive: true,
      type: "CART_UPSELL",
      OR: [
        { triggerProductId: product.id },
        ...(product.categoryId ? [{ triggerCategoryId: product.categoryId }] : []),
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: {
      offerProduct: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          images: {
            where: { kind: "STANDARD" },
            select: { url: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
          variants: {
            where: { isActive: true, stock: { gt: 0 } },
            select: { id: true, price: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  const offers: UpsellOffer[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    const p = rule.offerProduct;
    const variant = p.variants[0];
    if (p.status !== "ACTIVE" || !variant) continue;
    if (p.id === product.id || inCartIds.has(p.id) || seen.has(p.id)) continue;
    seen.add(p.id);
    offers.push({
      ruleId: rule.id,
      type: rule.type,
      name: rule.name,
      productId: p.id,
      slug: p.slug,
      productName: p.name,
      imageUrl: p.images[0]?.url ?? null,
      variantId: variant.id,
      originalPrice: variant.price,
      offerPrice:
        variant.price -
        upsellUnitDiscount(variant.price, { type: rule.discountType, value: rule.discountValue }),
    });
    if (offers.length === MAX_OFFERS) break;
  }
  return offers;
}
