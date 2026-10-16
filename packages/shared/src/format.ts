const taka = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** The one place money is formatted for display: whole taka as `৳1,190` (lakh grouping: `৳1,00,000`). */
export function formatTaka(amount: number): string {
  return `৳${taka.format(Math.round(amount))}`;
}

/** Percent off for badges, rounded; 0 when there is no real discount. */
export function discountPercent(price: number, comparePrice: number | null | undefined): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}
