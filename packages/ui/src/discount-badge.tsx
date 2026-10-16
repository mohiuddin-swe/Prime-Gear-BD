import { discountPercent } from "@primegear/shared/format";
import { cn } from "./cn";

export type DiscountBadgeProps = {
  /** Give `percent` directly, or price + compareAt to derive it */
  percent?: number;
  price?: number;
  compareAt?: number | null;
  className?: string;
};

/** Amber is for deals only. Ink text on amber passes AA; white on amber would not. */
export function DiscountBadge({ percent, price, compareAt, className }: DiscountBadgeProps) {
  const value = percent ?? (price != null ? discountPercent(price, compareAt) : 0);
  if (value <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-btn bg-deal px-2 text-sm font-bold tabular-nums text-ink-950",
        className,
      )}
    >
      -{value}%
    </span>
  );
}
