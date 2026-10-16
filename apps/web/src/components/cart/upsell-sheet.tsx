"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { formatTaka } from "@primegear/shared/format";
import { Button } from "@primegear/ui/button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";
import type { UpsellOffer } from "@primegear/shared";
import { useCart } from "./cart-provider";

/** The offer rows. Mounted only while the sheet is open, so "Added" state resets for every new offer set. */
function OfferList({ offers }: { offers: UpsellOffer[] }) {
  const { add, busy } = useCart();
  const [added, setAdded] = useState<Set<string>>(new Set());
  return (
    <ul className="space-y-3">
      {offers.map((o) => {
        const done = added.has(o.ruleId);
        return (
          <li
            key={o.ruleId}
            className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card"
          >
            <span className="relative size-16 shrink-0 overflow-hidden rounded-btn bg-surface">
              {o.imageUrl && (
                <Image src={o.imageUrl} alt="" fill sizes="64px" className="object-contain" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-base font-semibold leading-5">
                {o.productName}
              </span>
              <span className="flex flex-wrap items-baseline gap-x-2 text-base tabular-nums">
                <span className="font-bold">{formatTaka(o.offerPrice)}</span>
                {o.offerPrice < o.originalPrice && (
                  <s className="text-ink-900/60">
                    <span className="sr-only">Was </span>
                    {formatTaka(o.originalPrice)}
                  </s>
                )}
              </span>
            </span>
            <Button
              variant={done ? "ghost" : "outline"}
              className="shrink-0 px-3"
              disabled={done || busy}
              aria-label={done ? `${o.productName} added` : `Add ${o.productName} to cart`}
              onClick={async () => {
                const ok = await add(o.variantId, 1, {
                  productId: o.productId,
                  upsellRuleId: o.ruleId,
                });
                if (ok) setAdded((prev) => new Set(prev).add(o.ruleId));
              }}
            >
              {done ? (
                <Check size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              ) : (
                <Plus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              )}
              {done ? "Added" : "Add"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/** Shown after add-to-cart: up to 3 offers, one tap each. Items added here are recorded as upsells. */
export function UpsellSheet() {
  const { offers, closeOffers, openCart, cart } = useCart();
  return (
    <BottomSheet
      open={!!offers}
      onClose={closeOffers}
      title="Added to cart. Complete your setup"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={closeOffers}>
            Keep shopping
          </Button>
          <Button className="flex-1" onClick={openCart}>
            View cart{cart && cart.itemCount > 0 ? ` (${cart.itemCount})` : ""}
          </Button>
        </div>
      }
    >
      {offers && <OfferList offers={offers} />}
    </BottomSheet>
  );
}
