import { formatTaka } from "@primegear/shared/format";
import { cn } from "./cn";

export type PriceBlockProps = {
  amount: number;
  /** Original price, shown struck through when higher than `amount` */
  compareAt?: number | null;
  /** xs 16 px (related card) · sm 17 px (flash tile) · md 18 px (product card) · lg 24 px (hero) · xl 30 px (product page) */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** stacked: compare under the price, its row height reserved so grids stay aligned.
   *  inline: price, compare and (optionally) the Save badge on one baseline. */
  layout?: "stacked" | "inline";
  /** Show the "Save ৳X" badge (inline layout) */
  showSave?: boolean;
  /** `dark` for ink-950 backgrounds */
  tone?: "light" | "dark";
  className?: string;
};

// gap = space between price and compare in the inline layout
const sizes = {
  xs: { price: "text-base", compare: "text-xs", gap: "gap-x-1.5" },
  sm: { price: "text-lead", compare: "text-caption", gap: "gap-x-1.5" },
  md: { price: "text-lg", compare: "text-caption", gap: "gap-x-2" },
  lg: { price: "text-2xl", compare: "text-sm", gap: "gap-x-2" },
  xl: { price: "text-3xl", compare: "text-base", gap: "gap-x-2.5" },
} as const;

/** Prices are bold, tabular and ink-coloured (never red). */
export function PriceBlock({
  amount,
  compareAt,
  size = "md",
  layout = "inline",
  showSave = false,
  tone = "light",
  className,
}: PriceBlockProps) {
  const hasCompare = compareAt != null && compareAt > amount;
  const dark = tone === "dark";
  const s = sizes[size];
  const price = (
    <span
      className={cn(
        "font-heading font-extrabold tabular-nums",
        s.price,
        dark ? "text-white" : "text-ink-900",
      )}
    >
      {formatTaka(amount)}
    </span>
  );
  const compare = hasCompare ? (
    <s className={cn("tabular-nums", s.compare, dark ? "text-mist-dim" : "text-ink-400")}>
      <span className="sr-only">Was </span>
      {formatTaka(compareAt)}
    </s>
  ) : null;

  if (layout === "stacked") {
    return (
      <span className={cn("flex flex-col", className)}>
        {price}
        {/* Keeps cards with and without a compare price the same height */}
        <span className="h-4.5">{compare}</span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-y-1", s.gap, className)}>
      {price}
      {compare}
      {showSave && hasCompare && <SaveBadge amount={compareAt - amount} />}
    </span>
  );
}

/** Kept for existing callers: the inline price. */
export const Price = PriceBlock;
export type PriceProps = PriceBlockProps;

/** "Save ৳260": soft amber chip. Deal colours are for deals only. */
export function SaveBadge({ amount, className }: { amount: number; className?: string }) {
  if (amount <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-tag bg-deal-soft px-2 py-0.75 text-caption font-bold tabular-nums text-deal-ink",
        className,
      )}
    >
      Save {formatTaka(amount)}
    </span>
  );
}
