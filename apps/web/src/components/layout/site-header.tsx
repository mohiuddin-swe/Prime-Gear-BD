import Link from "next/link";
import { Search, ShoppingCart, User } from "lucide-react";
import { ICON_STROKE, Logo } from "@primegear/ui";

const iconBtn =
  "relative inline-flex size-11 items-center justify-center rounded-btn text-ink-900 active:bg-brand-50";

export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-900/10 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 px-4 py-2 md:grid-cols-[auto_1fr_auto] md:gap-x-6 md:px-6 md:py-3">
        <Link href="/" aria-label="Prime Gear BD home" className="flex min-h-11 items-center">
          <span className="md:hidden">
            <Logo size="mobile" />
          </span>
          <span className="hidden md:block">
            <Logo size="desktop" />
          </span>
        </Link>

        <form
          action="/search"
          role="search"
          className="relative col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1 md:mx-auto md:w-full md:max-w-xl"
        >
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <Search
            size={20}
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/70"
          />
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search smart plugs, LED strips…"
            className="h-12 w-full rounded-btn border border-ink-900/15 bg-surface pl-10 pr-3 text-base text-ink-900 placeholder:text-ink-900/60 md:h-11"
          />
        </form>

        <div className="flex items-center md:col-start-3 md:row-start-1">
          <Link href="/account" aria-label="Account" className={`${iconBtn} hidden md:inline-flex`}>
            <User size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </Link>
          <Link
            href="/cart"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            className={iconBtn}
          >
            <ShoppingCart size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-sm font-bold leading-none tabular-nums text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
