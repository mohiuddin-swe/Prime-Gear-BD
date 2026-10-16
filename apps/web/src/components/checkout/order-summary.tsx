import type { ReactNode } from "react";
import { formatTaka } from "@primegear/shared/format";
import type { Quote } from "@/lib/checkout-api";

const row = "flex justify-between gap-3 text-copy";

/** Lines, subtotal, delivery, discount and total. Every figure comes from the server quote. */
export function OrderSummary({
  quote,
  districtChosen,
  children,
}: {
  quote: Quote;
  districtChosen: boolean;
  /** Under the total, e.g. the coupon link */
  children?: ReactNode;
}) {
  const { pricing, items } = quote;
  return (
    <section
      aria-labelledby="summary-title"
      className="flex flex-col gap-2.5 rounded-panel bg-white p-4 shadow-card"
    >
      <h2 id="summary-title" className="mb-0.5 font-heading text-lead font-bold">
        Order summary
      </h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((i) => (
          <li key={i.id} className={row}>
            <span className="min-w-0 text-ink-700">
              {i.name}
              {i.variantName ? `, ${i.variantName}` : ""} × {i.quantity}
              {i.upsellSource ? <span className="text-ink-500"> (add-on)</span> : null}
            </span>
            {/* Before discounts, so the lines add up to the subtotal; savings show as Discount */}
            <span className="shrink-0 font-semibold tabular-nums">
              {formatTaka(i.baseUnitPrice * i.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2.5 border-t border-surface-sunken pt-2.5 tabular-nums">
        <div className={row}>
          <dt className="text-ink-500">Subtotal</dt>
          <dd>{formatTaka(pricing.subtotal)}</dd>
        </div>
        <div className={row}>
          <dt className="text-ink-500">Delivery</dt>
          <dd className={districtChosen ? undefined : "text-ink-500"}>
            {!districtChosen
              ? "Choose district"
              : pricing.shippingFee === 0
                ? "Free"
                : formatTaka(pricing.shippingFee ?? 0)}
          </dd>
        </div>
        {pricing.discount > 0 && (
          <div className={`${row} text-success-ink`}>
            <dt>Discount</dt>
            <dd>−{formatTaka(pricing.discount)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-surface-sunken pt-2.5">
          <dt className="text-base font-bold">Total</dt>
          <dd className="font-heading text-title font-extrabold">{formatTaka(pricing.total)}</dd>
        </div>
      </dl>
      {children}
    </section>
  );
}
