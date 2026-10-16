import type { ReactNode } from "react";
import { Plus, Star } from "lucide-react";
import { cn } from "./cn";
import { DiscountBadge } from "./discount-badge";
import { ICON_STROKE } from "./icon";
import { DefaultLink, type LinkLike } from "./icon-button";
import { PriceBlock } from "./price";

export type ProductCardProps = {
  name: string;
  href: string;
  /** A 1:1 `next/image` (with `sizes`) or any element; rendered on the light-gray backdrop */
  image: ReactNode;
  price: number;
  compareAt?: number | null;
  /**
   * grid (default): white card, 2-up category / bestseller grids, with quick add.
   * rail: flash-sale tile, no card chrome; the parent sets the width (140 px in the mockup).
   * mini: "You may also like" card, padded white card; the parent sets the width (150 px).
   */
  variant?: "grid" | "rail" | "mini";
  rating?: { value: number; count: number };
  outOfStock?: boolean;
  /** Quick-add control (grid only), usually `<QuickAddButton />` from a client component */
  quickAdd?: ReactNode;
  /** Pass next/link so navigation is client-side */
  LinkComponent?: LinkLike;
  className?: string;
};

const imageFill =
  "relative block h-full w-full [&>img]:h-full [&>img]:w-full [&>img]:object-contain";

// Every variant's <article> is `relative`: cards sit inside overflow-x-auto rails, and without a
// positioned ancestor the price's absolutely positioned sr-only text escapes the rail's clip, widens
// the page and makes mobile browsers zoom out (which pushes the fixed order bar off-screen).

/** White card on the surface background; image 1:1 on the sunken backdrop, price + add button below. */
export function ProductCard({
  name,
  href,
  image,
  price,
  compareAt,
  variant = "grid",
  rating,
  outOfStock,
  quickAdd,
  LinkComponent = DefaultLink,
  className,
}: ProductCardProps) {
  const media = (
    <>
      <LinkComponent href={href} className="block h-full w-full">
        <span className="sr-only">{name}</span>
        <span className={imageFill}>{image}</span>
      </LinkComponent>
      {variant !== "mini" && (
        <DiscountBadge
          price={price}
          compareAt={compareAt}
          size={variant === "rail" ? "sm" : "md"}
          className={cn("absolute", variant === "rail" ? "left-2 top-2" : "left-2.5 top-2.5")}
        />
      )}
      {outOfStock && (
        <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-ink-950 px-2 py-1 text-xs font-semibold text-white">
          Out of stock
        </span>
      )}
    </>
  );

  if (variant === "rail") {
    return (
      <article className={cn("relative flex flex-col gap-2", className)}>
        <div className="relative aspect-square overflow-hidden rounded-tile bg-surface-sunken">
          {media}
        </div>
        <h3 className="line-clamp-2 h-9.5 text-sm font-medium leading-card text-ink-900">
          <LinkComponent href={href}>{name}</LinkComponent>
        </h3>
        <PriceBlock amount={price} compareAt={compareAt} size="sm" />
      </article>
    );
  }

  if (variant === "mini") {
    return (
      <article
        className={cn(
          "relative flex flex-col gap-1.5 rounded-card bg-white p-2.5 shadow-card",
          className,
        )}
      >
        <div className="relative aspect-square overflow-hidden rounded-btn bg-surface-sunken">
          {media}
        </div>
        <h3 className="line-clamp-2 text-sm font-medium leading-label text-ink-900">
          <LinkComponent href={href}>{name}</LinkComponent>
        </h3>
        <PriceBlock amount={price} compareAt={compareAt} size="xs" />
      </article>
    );
  }

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-card bg-white shadow-card transition",
        "motion-safe:active:-translate-y-0.5 motion-safe:active:shadow-card-lift",
        className,
      )}
    >
      <div className="relative aspect-square bg-surface-sunken">{media}</div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 h-10 text-copy font-medium text-ink-900">
          <LinkComponent href={href}>{name}</LinkComponent>
        </h3>
        {rating && (
          <p className="flex items-center gap-1 text-sm text-ink-900">
            <Star
              size={16}
              strokeWidth={ICON_STROKE}
              className="fill-brand-600 text-brand-600"
              aria-hidden="true"
            />
            <span className="font-semibold tabular-nums">{rating.value.toFixed(1)}</span>
            <span className="text-ink-500 tabular-nums">({rating.count})</span>
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2">
          <PriceBlock amount={price} compareAt={compareAt} layout="stacked" />
          {quickAdd}
        </div>
      </div>
    </article>
  );
}

/** 44 px add button. A client component passes `onClick`; this stays presentational. */
export function QuickAddButton({
  label = "Add to cart",
  ...props
}: { label?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-btn bg-brand-gradient text-white transition motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      {...props}
    >
      <Plus size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
