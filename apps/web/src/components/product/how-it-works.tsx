import { Banknote, PhoneCall, ShoppingBag, Truck } from "lucide-react";
import { ICON_STROKE } from "@primegear/ui";

const steps = [
  {
    Icon: ShoppingBag,
    title: "Place your order",
    caption: "Name, phone and address. No account needed.",
  },
  { Icon: PhoneCall, title: "We call to confirm", caption: "Our team confirms your order." },
  { Icon: Truck, title: "Fast delivery", caption: "Inside and outside Dhaka." },
  { Icon: Banknote, title: "Pay on delivery", caption: "Check the product, then pay cash." },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="space-y-3">
      <h2 id="how-it-works" className="font-heading text-xl font-bold">
        How it works
      </h2>
      <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {steps.map(({ Icon, title, caption }, i) => (
          <li key={title} className="flex gap-3 rounded-card bg-white p-3 shadow-card">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-brand-50 text-brand-600">
              <Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold leading-5">
                {i + 1}. {title}
              </span>
              <span className="block text-sm leading-5 text-ink-900/70">{caption}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
