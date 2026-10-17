import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, PackageCheck, PhoneCall, Truck } from "lucide-react";
import { formatTaka } from "@primegear/shared/format";
import { ButtonLink } from "@primegear/ui";
import { ICON_STROKE } from "@primegear/ui/icon";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { ApiRequestError, getOrder } from "@/lib/api";

type Props = { params: Promise<{ orderNumber: string }> };

export const metadata: Metadata = {
  title: "Order placed | Prime Gear BD",
  robots: { index: false, follow: false },
};

const steps = [
  {
    Icon: PhoneCall,
    title: "We call you to confirm",
    caption: "Keep your phone nearby. We confirm the order and delivery details.",
  },
  {
    Icon: PackageCheck,
    title: "We pack your order",
    caption: "Once confirmed, your items are packed and handed to the courier.",
  },
  {
    Icon: Truck,
    title: "Delivery and cash payment",
    caption: "Check your items, then pay the courier in cash.",
  },
];

export default async function OrderPage({ params }: Props) {
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber).catch((err) => {
    if (err instanceof ApiRequestError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-6 md:py-10">
      <ScrollToTop />
      <header className="space-y-2 text-center">
        <CircleCheck
          size={56}
          strokeWidth={ICON_STROKE}
          className="mx-auto text-success"
          aria-hidden="true"
        />
        <h1 className="font-heading text-3xl font-extrabold">Thank you! Your order is placed</h1>
        <p className="text-base">
          Order number <strong className="tabular-nums">{order.orderNumber}</strong>
        </p>
        <p className="rounded-card bg-brand-50 p-3 text-base font-semibold">
          We will call you to confirm your order on {order.maskedPhone}.
        </p>
      </header>

      <section
        aria-labelledby="next-steps"
        className="space-y-3 rounded-card bg-white p-4 shadow-card"
      >
        <h2 id="next-steps" className="font-heading text-lg font-bold">
          What happens next
        </h2>
        <ol className="space-y-3">
          {steps.map(({ Icon, title, caption }, i) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-600">
                <Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-semibold">
                  {i + 1}. {title}
                </span>
                <span className="block text-base text-ink-900/70">{caption}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="summary"
        className="space-y-3 rounded-card bg-white p-4 shadow-card"
      >
        <h2 id="summary" className="font-heading text-lg font-bold">
          Order summary
        </h2>
        <ul className="divide-y divide-ink-900/10">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-3 py-2 first:pt-0">
              <span className="min-w-0 text-base">
                <span className="block font-semibold">{i.name}</span>
                <span className="block text-ink-900/70">
                  {i.variantName ? `${i.variantName} · ` : ""}Qty {i.quantity}
                </span>
              </span>
              <span className="text-base font-bold tabular-nums">{formatTaka(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-ink-900/10 pt-3 text-base tabular-nums">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatTaka(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between font-semibold">
              <dt>Discount</dt>
              <dd>-{formatTaka(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Delivery ({order.district})</dt>
            <dd>{order.shippingFee === 0 ? "Free" : formatTaka(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink-900/10 pt-2 text-lg font-bold">
            <dt>Total to pay</dt>
            <dd>{formatTaka(order.total)}</dd>
          </div>
        </dl>
        <p className="text-base">Payment: Cash on Delivery</p>
      </section>

      <ButtonLink href="/" className="w-full">
        Continue shopping
      </ButtonLink>
    </div>
  );
}
