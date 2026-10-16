import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ProductCard as ProductCardData } from "@primegear/shared";
import { cn } from "@primegear/ui/cn";
import { ProductCard, type ProductCardProps } from "@primegear/ui/product-card";
import { productPath } from "@/lib/site";

/**
 * The "+" on grid cards. Cards carry no variant id, so it opens the product page to pick one.
 * Hidden from assistive tech and the tab order: the image and name already link there.
 * TODO: add to cart directly once the product list API returns the default variant id.
 */
function QuickAddLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-hidden="true"
      tabIndex={-1}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-btn bg-brand-gradient text-white transition motion-safe:active:scale-95"
    >
      <Plus size={20} strokeWidth={2} />
    </Link>
  );
}

export function ProductCardItem({
  product,
  variant,
  quickAdd = false,
  className,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw",
}: {
  product: ProductCardData;
  variant?: ProductCardProps["variant"];
  /** Show the "+" button (grid variant) */
  quickAdd?: boolean;
  className?: string;
  sizes?: string;
}) {
  const href = productPath(product.slug);
  return (
    <ProductCard
      className={className}
      variant={variant}
      name={product.name}
      href={href}
      LinkComponent={Link}
      price={product.price}
      compareAt={product.comparePrice}
      outOfStock={!product.inStock}
      quickAdd={quickAdd ? <QuickAddLink href={href} /> : undefined}
      image={
        product.imageUrl ? (
          <Image src={product.imageUrl} alt="" fill sizes={sizes} className="object-contain" />
        ) : null
      }
    />
  );
}

export function ProductGrid({
  products,
  quickAdd = false,
  className,
}: {
  products: ProductCardData[];
  quickAdd?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4", className)}>
      {products.map((p) => (
        <li key={p.id} className="flex">
          <ProductCardItem product={p} quickAdd={quickAdd} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
