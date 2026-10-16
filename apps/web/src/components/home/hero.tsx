import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonClasses, Eyebrow, PriceBlock, SectionDark } from "@primegear/ui";

export type HeroProduct = {
  name: string;
  /** Short selling line under the name (product.shortDescription) */
  blurb: string | null;
  /** Small tag above the name, e.g. "Bestseller · LED Lighting" */
  tag: string;
  price: number;
  compareAt: number | null;
  href: string;
  /** Dark-room shot when there is one, otherwise the main product image */
  imageUrl: string | null;
};

/**
 * Dark hero card: one featured product with its price and a Shop now button.
 * Phones: 400 px tall, the product shot bleeds off the right edge behind the copy.
 * md+: the shot moves into its own column.
 */
export function Hero({ product }: { product: HeroProduct }) {
  return (
    <SectionDark
      card
      glow="hero"
      className="mx-4 mt-3 md:mx-6 md:mt-6"
      contentClassName="relative flex min-h-100 flex-col gap-3 px-5 pb-5.5 pt-6 md:min-h-96 md:justify-center md:px-12 md:py-12 xl:min-h-112"
    >
      {product.imageUrl && (
        <div className="pointer-events-none absolute -right-9 bottom-7.5 size-57.5 md:inset-y-0 md:right-6 md:my-auto md:size-80 xl:right-16 xl:size-96">
          <Image
            src={product.imageUrl}
            alt=""
            fill
            preload
            fetchPriority="high"
            sizes="(min-width: 1280px) 384px, (min-width: 768px) 320px, 230px"
            // Feather the edges so a rectangular photo melts into the dark card
            className="object-contain mask-radial-from-55% mask-radial-to-72%"
          />
        </div>
      )}
      <Eyebrow pill className="relative">
        {product.tag}
      </Eyebrow>
      <h1 className="relative line-clamp-3 max-w-60 font-heading text-3xl font-extrabold leading-hero tracking-display text-white md:max-w-80 md:text-4xl xl:max-w-xl xl:text-5xl">
        {product.name}
      </h1>
      {product.blurb && (
        <p className="relative line-clamp-3 max-w-52.5 text-copy leading-normal text-mist md:max-w-80 md:text-base xl:max-w-md">
          {product.blurb}
        </p>
      )}
      <PriceBlock
        amount={product.price}
        compareAt={product.compareAt}
        size="lg"
        tone="dark"
        className="relative mt-auto md:mt-4"
      />
      <Link
        href={product.href}
        className={buttonClasses("primary", "relative self-start px-5.5 shadow-cta-hero md:h-12")}
      >
        Shop now
        <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
      </Link>
    </SectionDark>
  );
}
