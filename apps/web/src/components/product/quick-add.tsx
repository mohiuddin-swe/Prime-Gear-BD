"use client";

import { QuickAddButton } from "@primegear/ui/product-card";
import { useCart } from "@/components/cart/cart-provider";

/** The "+" on a grid card for a single-variant product: adds one piece, then upsells or the drawer. */
export function QuickAdd({
  productId,
  variantId,
  name,
}: {
  productId: string;
  variantId: string;
  name: string;
}) {
  const { add, busy } = useCart();
  return (
    <QuickAddButton
      label={`Add ${name} to cart`}
      disabled={busy}
      onClick={() => void add(variantId, 1, { productId })}
    />
  );
}
