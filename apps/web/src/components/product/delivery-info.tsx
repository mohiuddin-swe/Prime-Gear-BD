"use client";

import { formatTaka } from "@primegear/shared/format";
import { useCart } from "@/components/cart/cart-provider";

/** Delivery fees come from the store settings the cart already carries (configured in admin). */
export function DeliveryInfo() {
  const { cart } = useCart();
  const rows: [string, string][] = [];
  // Fees appear once the cart has loaded (it loads on every page)
  if (cart) {
    rows.push(["Inside Dhaka", formatTaka(cart.shipping.insideDhaka)]);
    rows.push(["Outside Dhaka", formatTaka(cart.shipping.outsideDhaka)]);
    if (cart.freeDelivery.threshold) {
      rows.push(["Free delivery", `Orders over ${formatTaka(cart.freeDelivery.threshold)}`]);
    }
  }
  rows.push(["Payment", "Cash on delivery: check it, then pay"]);
  rows.push(["Replacement", "7 days if it arrives faulty or damaged"]);
  return <SpecRows rows={rows} />;
}

/** Label / value rows with hairlines, shared by the specifications and delivery sections. */
export function SpecRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-col px-4 pb-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 border-t border-surface-sunken py-3">
          <dt className="flex-1 text-copy text-ink-500">{label}</dt>
          <dd className="text-right text-copy font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
