"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomNav as BottomNavBar, defaultBottomNavItems } from "@primegear/ui/bottom-nav";
import { useCart } from "@/components/cart/cart-provider";

type Section = "home" | "categories" | "search" | "account";

const activeSection = (pathname: string): Section | undefined => {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/categories") || pathname.startsWith("/product-category")) {
    return "categories";
  }
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/account")) return "account";
  return undefined;
};

/** Mobile only: hidden from md up. Cart opens the drawer instead of a page. */
export function BottomNav() {
  const pathname = usePathname();
  const { openCart, itemCount } = useCart();
  // The checkout is a focused page: its own pinned order bar takes the place of the navigation
  if (pathname.startsWith("/checkout")) return null;
  // Product pages pin their order bar (total, cart, Order now, WhatsApp) where the navigation sits
  if (pathname.startsWith("/product/")) return null;
  // The categories screen is a full-screen menu with its own close button
  if (pathname.startsWith("/categories")) return null;

  return (
    <BottomNavBar
      LinkComponent={Link}
      items={defaultBottomNavItems({
        active: activeSection(pathname),
        cartCount: itemCount,
        onCartClick: openCart,
        hrefs: { categories: "/categories/", search: "/search/", account: "/account/" },
      })}
    />
  );
}
