"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2x2, Home, Search, ShoppingCart, User } from "lucide-react";
import { cn, ICON_STROKE } from "@primegear/ui";

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/categories", label: "Categories", Icon: Grid2x2 },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/cart", label: "Cart", Icon: ShoppingCart },
  { href: "/account", label: "Account", Icon: User },
];

/** Mobile only: hidden from md up. */
export function BottomNav({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-900/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm font-medium",
                  active ? "text-brand-600" : "text-ink-900",
                )}
              >
                <span className="relative">
                  <Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  {href === "/cart" && cartCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-sm font-bold leading-none tabular-nums text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
