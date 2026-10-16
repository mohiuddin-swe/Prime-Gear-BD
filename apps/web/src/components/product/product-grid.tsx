import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { ProductCard as ProductCardData } from "@primegear/shared";
import { cn } from "@primegear/ui/cn";
import { ProductCard, type ProductCardProps } from "@primegear/ui/product-card";
import { productPath } from "@/lib/site";
import { QuickAdd } from "./quick-add";

/**
 * The "+" on cards whose product needs a choice (several variants) or is out of stock: it opens
 * the product page. Hidden from assistive tech and the tab order: the image and name already link there.
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
      quickAdd={
        !quickAdd ? undefined : product.quickAddVariantId ? (
          <QuickAdd
            productId={product.id}
            variantId={product.quickAddVariantId}
            name={product.name}
          />
        ) : (
          <QuickAddLink href={href} />
        )
      }
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
