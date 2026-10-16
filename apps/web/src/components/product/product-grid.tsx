import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardData } from "@primegear/shared";
import { cn } from "@primegear/ui/cn";
import { ProductCard } from "@primegear/ui/product-card";
import { productPath } from "@/lib/site";

export function ProductCardItem({
  product,
  className,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw",
}: {
  product: ProductCardData;
  className?: string;
  sizes?: string;
}) {
  return (
    <ProductCard
      className={className}
      name={product.name}
      href={productPath(product.slug)}
      LinkComponent={Link}
      price={product.price}
      compareAt={product.comparePrice}
      outOfStock={!product.inStock}
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
  className,
}: {
  products: ProductCardData[];
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4", className)}>
      {products.map((p) => (
        <li key={p.id} className="flex">
          <ProductCardItem product={p} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
