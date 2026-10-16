import type { ProductCard } from "@primegear/shared";
import { ProductCardItem } from "@/components/product/product-grid";
import { Countdown } from "./countdown";

export const FLASH_SALE_ID = "flash-sale";

/** White panel: title + amber timer, then a sideways rail of 140 px deal tiles. */
export function FlashSale({ products, endsAt }: { products: ProductCard[]; endsAt: string }) {
  return (
    <section
      id={FLASH_SALE_ID}
      aria-labelledby="flash-sale-title"
      className="mx-4 mt-5 flex scroll-mt-[calc(var(--header-h)+1rem)] flex-col gap-3.5 rounded-panel bg-white p-4 shadow-card md:mx-6 md:mt-8 md:p-6"
    >
      <div className="flex items-center gap-2">
        <h2
          id="flash-sale-title"
          className="flex-1 font-heading text-xl font-bold tracking-heading text-ink-900 md:text-2xl"
        >
          Flash sale
        </h2>
        <Countdown endsAt={endsAt} />
      </div>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 scrollbar-none md:-mx-6 md:gap-4 md:px-6 [&::-webkit-scrollbar]:hidden">
        {products.map((p) => (
          <li key={p.id} className="w-35 shrink-0 md:w-44">
            <ProductCardItem product={p} variant="rail" sizes="(min-width: 768px) 176px, 140px" />
          </li>
        ))}
      </ul>
    </section>
  );
}
