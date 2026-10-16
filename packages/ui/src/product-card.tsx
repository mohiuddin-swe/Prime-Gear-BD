import type { ComponentType, ReactNode } from "react";
import { Plus, Star } from "lucide-react";
import { cn } from "./cn";
import { DiscountBadge } from "./discount-badge";
import { ICON_STROKE } from "./icon";
import { Price } from "./price";

type LinkLike = ComponentType<{ href: string; className?: string; children: ReactNode }>;

export type ProductCardProps = {
  name: string;
  href: string;
  /** A 1:1 `next/image` (with `sizes`) or any element; rendered on the light-gray backdrop */
  image: ReactNode;
  price: number;
  compareAt?: number | null;
  rating?: { value: number; count: number };
  outOfStock?: boolean;
  /** Quick-add control, usually `<QuickAddButton />` from a client component */
  quickAdd?: ReactNode;
  /** Pass next/link so navigation is client-side */
  LinkComponent?: LinkLike;
  className?: string;
};

const DefaultLink: LinkLike = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

/** White card on the surface background; image 1:1 on a light-gray backdrop. */
export function ProductCard({
  name,
  href,
  image,
  price,
  compareAt,
  rating,
  outOfStock,
  quickAdd,
  LinkComponent = DefaultLink,
  className,
}: ProductCardProps) {
  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-card bg-white shadow-card transition",
        "motion-safe:active:-translate-y-0.5 motion-safe:active:shadow-card-lift",
        className,
      )}
    >
      <div className="relative aspect-square bg-surface">
        <LinkComponent href={href} className="block h-full w-full">
          <span className="sr-only">{name}</span>
          <span className="block h-full w-full [&>img]:h-full [&>img]:w-full [&>img]:object-contain">
            {image}
          </span>
        </LinkComponent>
        <DiscountBadge price={price} compareAt={compareAt} className="absolute left-2 top-2" />
        {outOfStock && (
          <span className="absolute left-2 bottom-2 rounded-btn bg-ink-950 px-2 py-1 text-sm font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-ink-900">
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
            <span className="text-ink-900/70 tabular-nums">({rating.count})</span>
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <Price amount={price} compareAt={compareAt} />
          {quickAdd}
        </div>
      </div>
    </article>
  );
}

/** 44 px round add button. A client component passes `onClick`; this stays presentational. */
export function QuickAddButton({
  label = "Add to cart",
  ...props
}: { label?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-btn bg-brand-gradient text-white shadow-card transition motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      {...props}
    >
      <Plus size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
    </button>
  );
}
