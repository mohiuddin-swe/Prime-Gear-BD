import type { ReactNode } from "react";
import { ChevronLeft, Menu, MessageCircle, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "./cn";
import { ICON_STROKE } from "./icon";
import { CountBadge, DefaultLink, IconButton, type LinkLike } from "./icon-button";
import { Logo } from "./logo";

export type HeaderProps = {
  homeHref?: string;
  /** Menu opens the categories screen: give an href, or onMenuClick for a client handler */
  menuHref?: string;
  onMenuClick?: () => void;
  whatsappHref?: string;
  /** Account link, shown from md up (on phones it lives in the bottom navigation) */
  accountHref?: string;
  cartCount: number;
  cartHref?: string;
  /** Cart opens as a drawer: use this instead of cartHref */
  onCartClick?: () => void;
  /** Where the search form submits (GET ?q=) */
  searchAction?: string;
  searchPlaceholder?: string;
  LinkComponent?: LinkLike;
  className?: string;
};

const countLabel = (n: number) => `Cart, ${n} ${n === 1 ? "item" : "items"}`;

/**
 * Home header. Phones: menu, logo, WhatsApp and cart on one row, a 48 px search field below.
 * From md: one row, search in the middle (max 576 px), account + WhatsApp + cart on the right.
 * White with a hairline shadow. Wrap in a sticky container if it should stick.
 */
export function Header({
  homeHref = "/",
  menuHref,
  onMenuClick,
  whatsappHref,
  accountHref,
  cartCount,
  cartHref,
  onCartClick,
  searchAction = "/search",
  searchPlaceholder = "Search lights, gadgets, smart home",
  LinkComponent = DefaultLink,
  className,
}: HeaderProps) {
  return (
    <header className={cn("bg-white shadow-hairline", className)}>
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 pb-3 pt-2.5 md:flex-row md:items-center md:gap-4 md:px-6 md:py-3">
        {/* md: `contents` lets the search field slot in between the logo and the actions */}
        <div className="flex items-center gap-1 md:contents">
          <IconButton
            label="Open menu"
            href={menuHref}
            onClick={onMenuClick}
            LinkComponent={LinkComponent}
            className="-ml-2.5"
          >
            <Menu size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </IconButton>
          <LinkComponent href={homeHref} aria-label="Prime Gear BD home" className="flex items-center">
            <Logo size="mobile" className="md:h-9" />
          </LinkComponent>
          <div className="flex-1 md:hidden" />
          <div className="flex items-center gap-1 md:order-2 md:-mr-2.5">
            {accountHref && (
              <IconButton
                label="Account"
                href={accountHref}
                LinkComponent={LinkComponent}
                className="hidden md:inline-flex"
              >
                <User size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </IconButton>
            )}
            {whatsappHref && (
              <IconButton label="WhatsApp support" href={whatsappHref} LinkComponent={LinkComponent}>
                <MessageCircle size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </IconButton>
            )}
            <CartIconButton
              count={cartCount}
              href={cartHref}
              onClick={onCartClick}
              LinkComponent={LinkComponent}
            />
          </div>
        </div>
        <SearchField
          action={searchAction}
          placeholder={searchPlaceholder}
          className="md:order-1 md:mx-auto md:w-full md:max-w-xl"
        />
      </div>
    </header>
  );
}

/** Shopping-bag icon with the blue count bubble (18 px, top-right). */
export function CartIconButton({
  count,
  href,
  onClick,
  LinkComponent,
  className,
}: {
  count: number;
  href?: string;
  onClick?: () => void;
  LinkComponent?: LinkLike;
  className?: string;
}) {
  return (
    <IconButton
      label={countLabel(count)}
      href={href}
      onClick={onClick}
      LinkComponent={LinkComponent}
      className={className}
    >
      <ShoppingBag size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <CountBadge
        count={count}
        className="absolute right-0.75 top-1.25 box-border h-4.5 min-w-4.5 px-1 text-2xs"
      />
    </IconButton>
  );
}

/** 48 px search field on the sunken background. 16 px text so iOS doesn't zoom. */
export function SearchField({
  action = "/search",
  placeholder,
  defaultValue,
  className,
}: {
  action?: string;
  placeholder: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <form action={action} role="search" className={className}>
      <label className="flex h-12 items-center gap-2.5 rounded-btn bg-surface-sunken px-3.5 text-ink-500">
        <Search size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label="Search products"
          className="min-w-0 flex-1 border-0 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
        />
      </label>
    </form>
  );
}

/**
 * Inner-page header: back button, title (or breadcrumb text) and up to a few action icons.
 * Used on category, product and checkout pages.
 */
export function PageHeader({
  backHref,
  backLabel = "Back",
  title,
  titleAs: Title = "h1",
  actions,
  hairline = false,
  LinkComponent = DefaultLink,
  className,
}: {
  backHref: string;
  backLabel?: string;
  title: ReactNode;
  /** Product pages show a breadcrumb line instead of a heading */
  titleAs?: "h1" | "p";
  actions?: ReactNode;
  hairline?: boolean;
  LinkComponent?: LinkLike;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center gap-0.5 bg-white py-2 pl-1 pr-2",
        hairline && "shadow-hairline",
        className,
      )}
    >
      <IconButton label={backLabel} href={backHref} LinkComponent={LinkComponent}>
        <ChevronLeft size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </IconButton>
      {Title === "h1" ? (
        <h1 className="flex-1 font-heading text-lg font-bold tracking-heading">{title}</h1>
      ) : (
        <p className="flex-1 text-sm text-ink-500">{title}</p>
      )}
      {actions}
    </header>
  );
}
