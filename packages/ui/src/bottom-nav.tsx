import type { ReactNode } from "react";
import { LayoutGrid, Home, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "./cn";
import { ICON_STROKE } from "./icon";
import { CountBadge, DefaultLink, type LinkLike } from "./icon-button";

export type BottomNavItem = {
  key: string;
  label: string;
  icon: ReactNode;
  href?: string;
  /** For items that open an overlay (the cart drawer) instead of navigating */
  onClick?: () => void;
  active?: boolean;
  /** Count bubble (cart) */
  badge?: number;
  ariaLabel?: string;
};

const navIcon = (Icon: typeof Home) => <Icon size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />;

/** The five mobile destinations, in mockup order. */
export function defaultBottomNavItems({
  active,
  cartCount,
  hrefs = {},
  onCartClick,
}: {
  active?: "home" | "categories" | "search" | "cart" | "account";
  cartCount: number;
  hrefs?: Partial<Record<"home" | "categories" | "search" | "cart" | "account", string>>;
  onCartClick?: () => void;
}): BottomNavItem[] {
  return [
    { key: "home", label: "Home", icon: navIcon(Home), href: hrefs.home ?? "/" },
    {
      key: "categories",
      label: "Categories",
      icon: navIcon(LayoutGrid),
      href: hrefs.categories ?? "/categories",
    },
    { key: "search", label: "Search", icon: navIcon(Search), href: hrefs.search ?? "/search" },
    {
      key: "cart",
      label: "Cart",
      icon: navIcon(ShoppingBag),
      href: onCartClick ? undefined : (hrefs.cart ?? "/cart"),
      onClick: onCartClick,
      badge: cartCount,
      ariaLabel: `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`,
    },
    { key: "account", label: "Account", icon: navIcon(User), href: hrefs.account ?? "/account" },
  ].map((item) => ({ ...item, active: item.key === active }));
}

const itemClass =
  "relative flex h-full w-full flex-col items-center justify-center gap-1 text-xs transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600";

/** Mobile only (hidden from md): 72 px bar, five equal items, active = brand-600 and semibold. */
export function BottomNav({
  items,
  LinkComponent = DefaultLink,
  className,
}: {
  items: BottomNavItem[];
  LinkComponent?: LinkLike;
  className?: string;
}) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 box-border h-[calc(72px+env(safe-area-inset-bottom))] border-t border-line bg-white pb-[max(6px,env(safe-area-inset-bottom))] md:hidden",
        className,
      )}
    >
      <ul className="grid h-full grid-cols-5">
        {items.map((item) => {
          const cls = cn(
            itemClass,
            item.active ? "font-semibold text-brand-600" : "font-medium text-ink-500",
          );
          const content = (
            <>
              {item.icon}
              {item.label}
              {item.badge != null && (
                <CountBadge
                  count={item.badge}
                  className="absolute left-1/2 top-2.25 ml-1 h-4 min-w-4 text-3xs"
                />
              )}
            </>
          );
          return (
            <li key={item.key}>
              {item.href ? (
                <LinkComponent
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  aria-label={item.ariaLabel}
                  className={cls}
                >
                  {content}
                </LinkComponent>
              ) : (
                <button type="button" onClick={item.onClick} aria-label={item.ariaLabel} className={cls}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
