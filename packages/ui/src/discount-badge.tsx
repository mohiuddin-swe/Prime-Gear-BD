import { discountPercent } from "@primegear/shared/format";
import { cn } from "./cn";

export type DiscountBadgeProps = {
  /** Give `percent` directly, or price + compareAt to derive it */
  percent?: number;
  price?: number;
  compareAt?: number | null;
  /** sm = flash-sale tile, md = product card, lg = product gallery */
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Amber is for deals only. Ink text on amber passes AA; white on amber would not. */
export function DiscountBadge({
  percent,
  price,
  compareAt,
  size = "md",
  className,
}: DiscountBadgeProps) {
  const value = percent ?? (price != null ? discountPercent(price, compareAt) : 0);
  if (value <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg bg-deal font-bold tabular-nums text-ink-950",
        size === "sm" && "rounded-tag px-1.75 py-0.75 text-xs",
        size === "md" && "px-2 py-1 text-xs",
        size === "lg" && "px-2.25 py-1.25 text-caption",
        className,
      )}
    >
      -{value}%
    </span>
  );
}
