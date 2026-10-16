"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { UpsellOffer } from "@primegear/shared";
import { formatTaka } from "@primegear/shared/format";
import { useCart } from "@/components/cart/cart-provider";
import { cartApi } from "@/lib/cart-api";

/**
 * One-tick add-on above the order summary. The offer comes from the cart's upsell rules
 * (looked up once, for the products already in the cart); ticking adds it at the offer price,
 * unticking removes the line again. Renders nothing when there is no offer.
 */
export function OrderBump() {
  const { cart, add, remove, busy } = useCart();
  const [offer, setOffer] = useState<UpsellOffer | null>(null);
  const looked = useRef(false);

  // Look once: after it is added the endpoint stops offering it, but the card must stay to untick
  useEffect(() => {
    if (looked.current || !cart || cart.items.length === 0) return;
    looked.current = true;
    const inCart = new Set(cart.items.map((i) => i.productId));
    Promise.all(
      [...inCart].slice(0, 3).map((id) => cartApi.upsells(id).catch(() => [] as UpsellOffer[])),
    )
      .then((lists) => setOffer(lists.flat().find((o) => !inCart.has(o.productId)) ?? null))
      .catch(() => undefined);
  }, [cart]);

  if (!offer) return null;
  const line = cart?.items.find((i) => i.productId === offer.productId);
  const checked = !!line;

  const toggle = async () => {
    if (line) await remove(line.id);
    else
      await add(offer.variantId, 1, {
        productId: offer.productId,
        upsellRuleId: offer.ruleId,
        afterAdd: "none",
      });
  };

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-card border-2 border-dashed border-deal bg-deal-cream p-3.5">
      <input
        type="checkbox"
        checked={checked}
        disabled={busy}
        onChange={toggle}
        className="size-5.5 shrink-0 accent-brand-600"
      />
      <span className="relative size-13 shrink-0 overflow-hidden rounded-control bg-white">
        {offer.imageUrl && (
          <Image src={offer.imageUrl} alt="" fill sizes="52px" className="object-contain p-1" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-copy font-semibold">Add {offer.productName}</span>
        <span className="text-sm text-deal-ink tabular-nums">
          Only <strong className="font-bold">{formatTaka(offer.offerPrice)}</strong> with this order{" "}
          {offer.offerPrice < offer.originalPrice && (
            <s className="text-ink-400">
              <span className="sr-only">was </span>
              {formatTaka(offer.originalPrice)}
            </s>
          )}
        </span>
      </span>
    </label>
  );
}
