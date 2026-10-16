export type BulkTierInput = {
  variantId: string | null;
  minQty: number;
  unitPrice: number;
  label: string | null;
};

export type TierOption = {
  minQty: number;
  unitPrice: number;
  /** BDT saved per unit versus the single-unit price */
  savePerUnit: number;
  savePercent: number;
  label: string | null;
};

/**
 * Selectable quantity tiers for one variant. Always starts with the single-unit price.
 * A tier set on the variant wins over a product-wide tier (variantId null) with the same minQty;
 * tiers that don't actually lower the price are dropped.
 */
export function bulkTierOptions(
  basePrice: number,
  tiers: BulkTierInput[],
  variantId: string,
): TierOption[] {
  const byQty = new Map<number, BulkTierInput>();
  for (const t of tiers) {
    if (t.variantId !== null && t.variantId !== variantId) continue;
    const existing = byQty.get(t.minQty);
    if (!existing || (existing.variantId === null && t.variantId !== null)) byQty.set(t.minQty, t);
  }
  const options: TierOption[] = [
    { minQty: 1, unitPrice: basePrice, savePerUnit: 0, savePercent: 0, label: null },
  ];
  for (const t of [...byQty.values()].sort((a, b) => a.minQty - b.minQty)) {
    if (t.minQty <= 1 || t.unitPrice >= basePrice) continue;
    options.push({
      minQty: t.minQty,
      unitPrice: t.unitPrice,
      savePerUnit: basePrice - t.unitPrice,
      savePercent: Math.round(((basePrice - t.unitPrice) / basePrice) * 100),
      label: t.label,
    });
  }
  return options;
}
