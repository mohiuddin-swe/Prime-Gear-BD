import { describe, expect, it } from "vitest";
import { bulkTierOptions } from "./pricing";

const tier = (minQty: number, unitPrice: number, variantId: string | null = null) => ({
  variantId,
  minQty,
  unitPrice,
  label: null,
});

describe("bulkTierOptions", () => {
  it("starts with the single-unit price and computes per-unit savings", () => {
    const opts = bulkTierOptions(1000, [tier(3, 900), tier(2, 950)], "v1");
    expect(opts.map((o) => [o.minQty, o.unitPrice, o.savePerUnit, o.savePercent])).toEqual([
      [1, 1000, 0, 0],
      [2, 950, 50, 5],
      [3, 900, 100, 10],
    ]);
  });

  it("prefers a variant tier over a product-wide tier and skips other variants", () => {
    const opts = bulkTierOptions(
      1000,
      [tier(2, 950), tier(2, 900, "v1"), tier(3, 800, "v2")],
      "v1",
    );
    expect(opts.map((o) => [o.minQty, o.unitPrice])).toEqual([
      [1, 1000],
      [2, 900],
    ]);
  });

  it("drops tiers that do not lower the price", () => {
    expect(bulkTierOptions(1000, [tier(2, 1000), tier(3, 1200)], "v1")).toHaveLength(1);
  });
});
