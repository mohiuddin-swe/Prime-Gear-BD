"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Heart, Share2 } from "lucide-react";
import { cn } from "@primegear/ui/cn";
import { CartIconButton, PageHeader } from "@primegear/ui/header";
import { iconButtonClasses } from "@primegear/ui/icon-button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { useCart } from "@/components/cart/cart-provider";

const WISHLIST_KEY = "pg_wishlist";
/** Same-tab change signal (the storage event only fires in other tabs) */
const WISHLIST_EVENT = "pg:wishlist";

function subscribeWishlist(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(WISHLIST_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(WISHLIST_EVENT, onChange);
  };
}

// The wishlist is a per-device convenience until customer accounts exist, so storage failures are ignored
function readWishlist(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function WishlistButton({ slug }: { slug: string }) {
  // Server render and hydration see "not saved"; the stored value applies right after
  const saved = useSyncExternalStore(
    subscribeWishlist,
    () => readWishlist().includes(slug),
    () => false,
  );

  const toggle = () => {
    try {
      const rest = readWishlist().filter((s) => s !== slug);
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(saved ? rest : [...rest, slug]));
      window.dispatchEvent(new Event(WISHLIST_EVENT));
    } catch {
      // Private mode / blocked storage: nothing to save to
    }
  };

  return (
    <button
      type="button"
      aria-label="Save to wishlist"
      aria-pressed={saved}
      onClick={toggle}
      className={iconButtonClasses}
    >
      <Heart
        size={22}
        strokeWidth={ICON_STROKE}
        aria-hidden="true"
        className={cn(saved && "fill-brand-600 text-brand-600")}
      />
    </button>
  );
}

function ShareButton({ name, url }: { name: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (navigator.share) {
      // Dismissing the share sheet rejects; that's not an error worth showing
      await navigator.share({ title: name, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard access: nothing sensible to fall back to
    }
  };

  return (
    <button
      type="button"
      aria-label={copied ? "Link copied" : "Share"}
      onClick={share}
      className={iconButtonClasses}
    >
      <Share2 size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </button>
  );
}

type Props = {
  slug: string;
  name: string;
  /** Absolute product URL, for sharing */
  url: string;
  backHref: string;
  backLabel: string;
  /** Breadcrumb line next to the back button: the category name */
  title: string;
};

/** Phones: back, category name, wishlist, share and cart. From md the site header takes over. */
export function ProductHeader({ slug, name, url, backHref, backLabel, title }: Props) {
  const { itemCount, openCart } = useCart();
  return (
    <PageHeader
      className="md:hidden"
      backHref={backHref}
      backLabel={backLabel}
      title={title}
      titleAs="p"
      LinkComponent={Link}
      actions={
        <>
          <WishlistButton slug={slug} />
          <ShareButton name={name} url={url} />
          <CartIconButton count={itemCount} onClick={openCart} />
        </>
      }
    />
  );
}

/** md+: wishlist and share beside the breadcrumbs (the site header already has the cart). */
export function ProductShareActions({ slug, name, url }: Pick<Props, "slug" | "name" | "url">) {
  return (
    <div className="flex items-center">
      <WishlistButton slug={slug} />
      <ShareButton name={name} url={url} />
    </div>
  );
}
