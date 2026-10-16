"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@primegear/ui/cn";
import { Header } from "@primegear/ui/header";
import { useCart } from "@/components/cart/cart-provider";
import { whatsappHref } from "@/lib/site";

/** Sticky store header. The cart icon opens the drawer (the cart is not a separate page). */
export function SiteHeader() {
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();
  // On phones the categories screen, category, product and checkout pages bring their own header (close / back button)
  const ownsMobileHeader =
    pathname.startsWith("/categories") ||
    pathname.startsWith("/product-category") ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/checkout");
  return (
    <Header
      className={cn("sticky top-0 z-30", ownsMobileHeader && "max-md:hidden")}
      menuHref="/categories/"
      accountHref="/account/"
      whatsappHref={whatsappHref ?? undefined}
      cartCount={itemCount}
      onCartClick={openCart}
      searchAction="/search/"
      LinkComponent={Link}
    />
  );
}
