import type { CartLine, ShippingZone } from "@primegear/shared";

/**
 * The single source of truth for cart and order money. Pure: no database, no I/O, so every rule
 * is unit-tested. All amounts are whole BDT integers.
 *
 * Rules
 * - subtotal = sum of base prices (list price x quantity).
 * - Bulk tiers: a tier set on a variant counts that line's quantity; a product-wide tier
 *   (variantId null) counts the quantity across all lines of the product. The best qualifying tier
 *   per group wins, and a tier never raises a price above the base price.
 * - An upsell discount applies to ONE unit of its line, after the bulk tier, never below 0.
 * - discount = subtotal - sum of line totals.
 * - Shipping: inside/outside Dhaka fee, 0 when subtotal - discount reaches the free-delivery threshold.
 */

export type PricingItem = {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  /** Variant price, BDT */
  unitPrice: number;
  upsell?: { type: "FIXED" | "PERCENT"; value: number } | null;
};

export type PricingTier = {
  productId: string;
  variantId: string | null;
  minQty: number;
  unitPrice: number;
};

export type PricingSettings = {
  insideDhakaFee: number;
  outsideDhakaFee: number;
  /** null or 0 = no free delivery */
  freeDeliveryThreshold: number | null;
};

export type PricedLine = Pick<
  CartLine,
  | "id"
  | "quantity"
  | "baseUnitPrice"
  | "unitPrice"
  | "upsellDiscount"
  | "lineTotal"
  | "savings"
  | "tier"
  | "nextTier"
>;

export type PricingResult = {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  shippingFee: number | null;
  total: number;
  freeDelivery: { threshold: number | null; remaining: number; qualifies: boolean };
};

type Candidate = { minQty: number; unitPrice: number; basisQty: number };

/** Best (highest minQty) tier the basis quantity qualifies for, and the nearest one it doesn't yet. */
function pickTier(tiers: PricingTier[], basisQty: number): { hit?: Candidate; next?: Candidate } {
  let hit: Candidate | undefined;
  let next: Candidate | undefined;
  for (const t of tiers) {
    const c = { minQty: t.minQty, unitPrice: t.unitPrice, basisQty };
    if (t.minQty <= basisQty) {
      if (!hit || t.minQty > hit.minQty) hit = c;
    } else if (!next || t.minQty < next.minQty) {
      next = c;
    }
  }
  return { hit, next };
}

/** BDT an upsell takes off one unit priced at `unitPrice`. Whole taka, never more than the unit price. */
export function upsellUnitDiscount(
  unitPrice: number,
  upsell: { type: "FIXED" | "PERCENT"; value: number } | null | undefined,
): number {
  if (!upsell || upsell.value <= 0) return 0;
  const raw =
    upsell.type === "PERCENT"
      ? Math.floor((unitPrice * Math.min(upsell.value, 100)) / 100)
      : upsell.value;
  return Math.max(0, Math.min(raw, unitPrice));
}

export function priceCart(input: {
  items: PricingItem[];
  tiers: PricingTier[];
  settings: PricingSettings;
  zone?: ShippingZone;
}): PricingResult {
  const { items, tiers, settings, zone } = input;

  const productQty = new Map<string, number>();
  for (const i of items)
    productQty.set(i.productId, (productQty.get(i.productId) ?? 0) + i.quantity);

  const lines: PricedLine[] = items.map((item) => {
    const productTiers = tiers.filter((t) => t.productId === item.productId);
    const variantTiers = productTiers.filter((t) => t.variantId === item.variantId);
    const wideTiers = productTiers.filter((t) => t.variantId === null);

    const v = pickTier(variantTiers, item.quantity);
    const w = pickTier(wideTiers, productQty.get(item.productId) ?? item.quantity);

    // Only tiers that actually lower the price count
    const applied = [v.hit, w.hit]
      .filter((c): c is Candidate => !!c && c.unitPrice < item.unitPrice)
      .sort((a, b) => a.unitPrice - b.unitPrice)[0];
    const unitPrice = applied ? applied.unitPrice : item.unitPrice;

    const upsellPerUnit = upsellUnitDiscount(unitPrice, item.upsell);
    const lineTotal = unitPrice * item.quantity - upsellPerUnit;

    const nextTier = [v.next, w.next]
      .filter((c): c is Candidate => !!c && c.unitPrice < unitPrice)
      .sort((a, b) => a.minQty - b.minQty)[0];

    return {
      id: item.id,
      quantity: item.quantity,
      baseUnitPrice: item.unitPrice,
      unitPrice,
      upsellDiscount: upsellPerUnit,
      lineTotal,
      savings: item.unitPrice * item.quantity - lineTotal,
      tier: applied ? { minQty: applied.minQty, unitPrice: applied.unitPrice } : null,
      nextTier: nextTier
        ? {
            minQty: nextTier.minQty,
            unitPrice: nextTier.unitPrice,
            addQty: nextTier.minQty - nextTier.basisQty,
          }
        : null,
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const afterDiscount = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discount = subtotal - afterDiscount;

  const threshold = settings.freeDeliveryThreshold || null;
  const qualifies = threshold !== null && items.length > 0 && afterDiscount >= threshold;
  const baseFee = zone === "OUTSIDE_DHAKA" ? settings.outsideDhakaFee : settings.insideDhakaFee;
  const shippingFee = zone === undefined ? null : items.length === 0 || qualifies ? 0 : baseFee;

  return {
    lines,
    subtotal,
    discount,
    shippingFee,
    total: afterDiscount + (shippingFee ?? 0),
    freeDelivery: {
      threshold,
      remaining: threshold === null ? 0 : Math.max(0, threshold - afterDiscount),
      qualifies,
    },
  };
}
