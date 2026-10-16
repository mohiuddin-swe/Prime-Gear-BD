import { formatTaka } from "@primegear/shared";
import { cn } from "./cn";

export type PriceProps = {
  amount: number;
  /** Original price, shown struck through when higher than `amount` */
  compareAt?: number | null;
  size?: "md" | "lg";
  className?: string;
};

/** Prices are bold, tabular and ink-coloured (never red). */
export function Price({ amount, compareAt, size = "md", className }: PriceProps) {
  const hasCompare = compareAt != null && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 tabular-nums", className)}>
      <span className={cn("font-bold text-ink-900", size === "lg" ? "text-2xl" : "text-base")}>
        {formatTaka(amount)}
      </span>
      {hasCompare && (
        <s className="text-base text-ink-900/60">
          <span className="sr-only">Was </span>
          {formatTaka(compareAt)}
        </s>
      )}
    </span>
  );
}
