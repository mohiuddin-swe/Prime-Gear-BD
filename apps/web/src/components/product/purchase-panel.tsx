"use client";

import { useMemo, useState } from "react";
import { CircleCheck, CircleX, ShoppingCart } from "lucide-react";
import type { ProductDetail } from "@primegear/shared";
import { formatTaka } from "@primegear/shared/format";
import { bulkTierOptions } from "@primegear/shared/pricing";
import { Button } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { DiscountBadge } from "@primegear/ui/discount-badge";
import { ICON_STROKE } from "@primegear/ui/icon";
import { Price } from "@primegear/ui/price";

type Props = Pick<ProductDetail, "variants" | "bulkTiers">;

/**
 * Variant selector, bulk tier cards, price and order actions (inline on md+, sticky bar on mobile).
 * Cart and checkout don't exist yet, so the buttons carry the selection but don't act on it.
 */
export function PurchasePanel({ variants, bulkTiers }: Props) {
  const firstInStock =
    variants.find((v) => v.isDefault && v.stock > 0) ?? variants.find((v) => v.stock > 0);
  const [variantId, setVariantId] = useState((firstInStock ?? variants[0])?.id ?? "");
  const [qty, setQty] = useState(1);

  const variant = variants.find((v) => v.id === variantId);
  const tiers = useMemo(
    () => (variant ? bulkTierOptions(variant.price, bulkTiers, variant.id) : []),
    [variant, bulkTiers],
  );
  if (!variant) return null;

  // Selected tier may not exist on a newly chosen variant: fall back to the single-unit price
  const tier = tiers.find((t) => t.minQty === qty) ?? tiers[0]!;
  const inStock = variant.stock > 0;
  const total = tier.unitPrice * tier.minQty;

  const actions = (
    <>
      <Button disabled={!inStock} className="flex-1 md:flex-none md:px-8">
        Order Now
      </Button>
      <Button variant="outline" disabled={!inStock} className="px-4 md:px-6">
        <ShoppingCart size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
        <span>
          Add<span className="hidden md:inline"> to cart</span>
        </span>
      </Button>
    </>
  );

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <Price amount={tier.unitPrice} compareAt={variant.comparePrice} size="lg" />
          <DiscountBadge price={tier.unitPrice} compareAt={variant.comparePrice} />
        </div>
        <p className="flex items-center gap-1.5 text-base">
          {inStock ? (
            <CircleCheck
              size={20}
              strokeWidth={ICON_STROKE}
              className="text-success"
              aria-hidden="true"
            />
          ) : (
            <CircleX
              size={20}
              strokeWidth={ICON_STROKE}
              className="text-danger"
              aria-hidden="true"
            />
          )}
          {inStock ? "In stock" : "Out of stock"}
        </p>
      </div>

      {variants.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="text-base font-semibold">Option</legend>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === variantId}
                disabled={v.stock <= 0}
                onClick={() => setVariantId(v.id)}
                className={cn(
                  "min-h-11 rounded-btn border-2 px-4 text-base font-semibold",
                  v.id === variantId
                    ? "border-brand-600 bg-brand-50 text-brand-600"
                    : "border-ink-900/15 bg-white text-ink-900",
                  "disabled:opacity-50 disabled:line-through",
                )}
              >
                {v.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {tiers.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="text-base font-semibold">Buy more, save more</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {tiers.map((t) => {
              const selected = t.minQty === tier.minQty;
              return (
                <button
                  key={t.minQty}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setQty(t.minQty)}
                  className={cn(
                    "flex min-h-20 flex-col items-start gap-0.5 rounded-card border-2 p-3 text-left",
                    selected
                      ? "border-transparent bg-brand-gradient text-white shadow-card"
                      : "border-ink-900/15 bg-white text-ink-900",
                  )}
                >
                  <span className="text-base font-bold">
                    {t.minQty === 1 ? "1 unit" : `Buy ${t.minQty}`}
                  </span>
                  <span className="text-base font-bold tabular-nums">
                    {formatTaka(t.unitPrice)}
                    <span className="font-semibold"> / unit</span>
                  </span>
                  {t.savePerUnit > 0 && (
                    <span className="flex items-center gap-1.5 text-base font-semibold tabular-nums">
                      Save {formatTaka(t.savePerUnit)}
                      <DiscountBadge percent={t.savePercent} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {tier.minQty > 1 && (
            <p className="text-base tabular-nums">
              {tier.minQty} × {formatTaka(tier.unitPrice)} = <strong>{formatTaka(total)}</strong>
            </p>
          )}
        </fieldset>
      )}

      <div className="hidden gap-3 md:flex">{actions}</div>

      {/* Mobile: sticky, sitting just above the 56 px bottom navigation */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-2 border-t border-ink-900/10 bg-white px-3 py-2 md:hidden">
        <div className="min-w-0 shrink-0">
          <Price amount={total} />
          {tier.minQty > 1 && <p className="text-sm tabular-nums">for {tier.minQty}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}
