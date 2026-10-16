import { describe, expect, it } from "vitest";
import {
  priceCart,
  type PricingItem,
  type PricingSettings,
  type PricingTier,
} from "./services/pricing.service";

const settings: PricingSettings = {
  insideDhakaFee: 60,
  outsideDhakaFee: 120,
  freeDeliveryThreshold: 3000,
};

const item = (over: Partial<PricingItem> = {}): PricingItem => ({
  id: "i1",
  productId: "p1",
  variantId: "v1",
  quantity: 1,
  unitPrice: 1000,
  ...over,
});
const tier = (
  minQty: number,
  unitPrice: number,
  variantId: string | null = null,
  productId = "p1",
): PricingTier => ({
  productId,
  variantId,
  minQty,
  unitPrice,
});

const price = (
  items: PricingItem[],
  tiers: PricingTier[] = [],
  opts: Partial<Parameters<typeof priceCart>[0]> = {},
) => priceCart({ items, tiers, settings, ...opts });

describe("empty cart", () => {
  it("is all zeros and never qualifies for free delivery", () => {
    const r = price([], [], { zone: "INSIDE_DHAKA" });
    expect(r).toMatchObject({
      subtotal: 0,
      discount: 0,
      shippingFee: 0,
      total: 0,
      freeDelivery: { threshold: 3000, remaining: 3000, qualifies: false },
    });
  });
});

describe("subtotal without discounts", () => {
  it("sums base price x quantity across lines", () => {
    const r = price([
      item({ quantity: 2 }),
      item({ id: "i2", productId: "p2", variantId: "v2", unitPrice: 500, quantity: 3 }),
    ]);
    expect(r.subtotal).toBe(3500);
    expect(r.discount).toBe(0);
    expect(r.lines.map((l) => l.lineTotal)).toEqual([2000, 1500]);
  });
});

describe("bulk tiers", () => {
  it("uses the base price below the first tier", () => {
    const r = price([item({ quantity: 2 })], [tier(3, 900, "v1")]);
    expect(r.lines[0]).toMatchObject({ unitPrice: 1000, tier: null, lineTotal: 2000 });
  });

  it("applies the tier at exactly minQty", () => {
    const r = price([item({ quantity: 3 })], [tier(3, 900, "v1")]);
    expect(r.lines[0]).toMatchObject({
      unitPrice: 900,
      lineTotal: 2700,
      savings: 300,
      tier: { minQty: 3, unitPrice: 900 },
    });
    expect(r.subtotal).toBe(3000);
    expect(r.discount).toBe(300);
  });

  it("picks the highest qualifying tier", () => {
    const r = price(
      [item({ quantity: 7 })],
      [tier(3, 900, "v1"), tier(6, 800, "v1"), tier(10, 700, "v1")],
    );
    expect(r.lines[0]).toMatchObject({ unitPrice: 800, lineTotal: 5600 });
  });

  it("never raises a price above the base price", () => {
    const r = price([item({ quantity: 3 })], [tier(3, 1200, "v1")]);
    expect(r.lines[0]).toMatchObject({ unitPrice: 1000, tier: null, savings: 0 });
  });

  it("variant tiers count only that line's quantity", () => {
    const r = price(
      [item({ quantity: 2 }), item({ id: "i2", variantId: "v2", quantity: 2 })],
      [tier(3, 900, "v1"), tier(3, 900, "v2")],
    );
    expect(r.lines.map((l) => l.unitPrice)).toEqual([1000, 1000]);
  });

  it("product-wide tiers count the quantity across all variants of the product", () => {
    const r = price(
      [item({ quantity: 2 }), item({ id: "i2", variantId: "v2", quantity: 1 })],
      [tier(3, 900, null)],
    );
    expect(r.lines.map((l) => l.unitPrice)).toEqual([900, 900]);
    expect(r.discount).toBe(300);
  });

  it("does not mix quantities of different products", () => {
    const r = price(
      [item({ quantity: 2 }), item({ id: "i2", productId: "p2", variantId: "v9", quantity: 2 })],
      [tier(3, 900, null, "p1"), tier(3, 900, null, "p2")],
    );
    expect(r.lines.map((l) => l.unitPrice)).toEqual([1000, 1000]);
  });

  it("takes the cheaper of a variant tier and a product-wide tier", () => {
    const r = price([item({ quantity: 3 })], [tier(3, 950, "v1"), tier(3, 900, null)]);
    expect(r.lines[0]!.unitPrice).toBe(900);
  });

  it("reports the next tier and how many more units unlock it", () => {
    const r = price([item({ quantity: 4 })], [tier(3, 900, "v1"), tier(6, 800, "v1")]);
    expect(r.lines[0]!.nextTier).toEqual({ minQty: 6, unitPrice: 800, addQty: 2 });
    expect(price([item({ quantity: 6 })], [tier(6, 800, "v1")]).lines[0]!.nextTier).toBeNull();
  });

  it("measures addQty for product-wide tiers against the product total", () => {
    const r = price(
      [item({ quantity: 1 }), item({ id: "i2", variantId: "v2", quantity: 1 })],
      [tier(5, 800, null)],
    );
    expect(r.lines[0]!.nextTier).toEqual({ minQty: 5, unitPrice: 800, addQty: 3 });
  });
});

describe("upsell discount", () => {
  it("takes a fixed amount off ONE unit only", () => {
    const r = price([item({ quantity: 3, upsell: { type: "FIXED", value: 100 } })]);
    expect(r.lines[0]).toMatchObject({ upsellDiscount: 100, lineTotal: 2900, savings: 100 });
    expect(r.discount).toBe(100);
  });

  it("takes a percent off one unit, rounding down to whole taka", () => {
    const r = price([item({ unitPrice: 999, upsell: { type: "PERCENT", value: 15 } })]);
    expect(r.lines[0]).toMatchObject({ upsellDiscount: 149, lineTotal: 850 });
  });

  it("never goes below zero", () => {
    expect(
      price([item({ unitPrice: 80, upsell: { type: "FIXED", value: 500 } })]).lines[0]!.lineTotal,
    ).toBe(0);
    expect(price([item({ upsell: { type: "PERCENT", value: 250 } })]).lines[0]!.lineTotal).toBe(0);
  });

  it("applies after the bulk tier", () => {
    const r = price(
      [item({ quantity: 3, upsell: { type: "PERCENT", value: 10 } })],
      [tier(3, 900, "v1")],
    );
    expect(r.lines[0]).toMatchObject({ unitPrice: 900, upsellDiscount: 90, lineTotal: 2610 });
    expect(r.discount).toBe(390);
  });

  it("ignores zero or negative values", () => {
    expect(price([item({ upsell: { type: "FIXED", value: 0 } })]).lines[0]!.upsellDiscount).toBe(0);
    expect(price([item({ upsell: { type: "FIXED", value: -50 } })]).lines[0]!.upsellDiscount).toBe(
      0,
    );
  });
});

describe("shipping", () => {
  it("is null while the zone is unknown, and the total excludes it", () => {
    const r = price([item()]);
    expect(r.shippingFee).toBeNull();
    expect(r.total).toBe(1000);
  });

  it("charges inside and outside Dhaka separately", () => {
    expect(price([item()], [], { zone: "INSIDE_DHAKA" })).toMatchObject({
      shippingFee: 60,
      total: 1060,
    });
    expect(price([item()], [], { zone: "OUTSIDE_DHAKA" })).toMatchObject({
      shippingFee: 120,
      total: 1120,
    });
  });

  it("is free at exactly the threshold and above", () => {
    expect(price([item({ quantity: 3 })], [], { zone: "OUTSIDE_DHAKA" })).toMatchObject({
      shippingFee: 0,
      total: 3000,
      freeDelivery: { remaining: 0, qualifies: true },
    });
    expect(price([item({ quantity: 4 })], [], { zone: "INSIDE_DHAKA" }).shippingFee).toBe(0);
  });

  it("charges just below the threshold and reports what is missing", () => {
    const r = price([item({ quantity: 2, unitPrice: 1499 })], [], { zone: "INSIDE_DHAKA" });
    expect(r.subtotal).toBe(2998);
    expect(r.shippingFee).toBe(60);
    expect(r.freeDelivery).toEqual({ threshold: 3000, remaining: 2, qualifies: false });
  });

  it("measures the threshold after discounts, not before", () => {
    // 3 x 1000 = 3000 list, but the tier brings it to 2700
    const r = price([item({ quantity: 3 })], [tier(3, 900, "v1")], { zone: "INSIDE_DHAKA" });
    expect(r.freeDelivery).toEqual({ threshold: 3000, remaining: 300, qualifies: false });
    expect(r).toMatchObject({ shippingFee: 60, total: 2760 });
  });

  it("treats a null or 0 threshold as no free delivery", () => {
    for (const freeDeliveryThreshold of [null, 0]) {
      const r = priceCart({
        items: [item({ quantity: 10 })],
        tiers: [],
        settings: { ...settings, freeDeliveryThreshold },
        zone: "INSIDE_DHAKA",
      });
      expect(r.shippingFee).toBe(60);
      expect(r.freeDelivery).toEqual({ threshold: null, remaining: 0, qualifies: false });
    }
  });
});

describe("totals", () => {
  it("total = subtotal - discount + shipping, all integers", () => {
    const r = price(
      [
        item({ quantity: 3, upsell: { type: "FIXED", value: 50 } }),
        item({ id: "i2", productId: "p2", variantId: "v2", unitPrice: 333 }),
      ],
      [tier(3, 900, "v1")],
      { zone: "OUTSIDE_DHAKA" },
    );
    expect(r.subtotal).toBe(3333);
    expect(r.discount).toBe(350);
    // 2983 after discount is under the 3000 threshold, so outside Dhaka is charged
    expect(r.shippingFee).toBe(120);
    expect(r.total).toBe(3333 - 350 + 120);
    expect(Number.isInteger(r.total)).toBe(true);
  });
});
