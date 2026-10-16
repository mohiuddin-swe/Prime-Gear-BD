import { Zap } from "lucide-react";
import type { ProductCard } from "@primegear/shared";
import { ICON_STROKE, SectionDark } from "@primegear/ui";
import { ProductCardItem } from "@/components/product/product-grid";
import { Countdown } from "./countdown";

export function FlashSale({ products, endsAt }: { products: ProductCard[]; endsAt: string }) {
  return (
    <SectionDark contentClassName="space-y-4 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold md:text-2xl">
          <Zap size={24} strokeWidth={ICON_STROKE} className="text-deal" aria-hidden="true" />
          Flash sale
        </h2>
        <Countdown endsAt={endsAt} />
      </div>
      <ul className="-mx-4 flex scroll-px-4 snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((p) => (
          <li key={p.id} className="flex w-44 shrink-0 snap-start md:w-56">
            <ProductCardItem product={p} className="w-full text-ink-900" sizes="224px" />
          </li>
        ))}
      </ul>
    </SectionDark>
  );
}
