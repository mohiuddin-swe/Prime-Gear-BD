"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { CartIconButton, PageHeader } from "@primegear/ui/header";
import { IconButton } from "@primegear/ui/icon-button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { useCart } from "@/components/cart/cart-provider";

/** Phones only: back button, page title, search and cart. From md the sticky site header takes over. */
export function MobilePageHeader({
  backHref,
  backLabel,
  title,
}: {
  backHref: string;
  backLabel: string;
  title: string;
}) {
  const { itemCount, openCart } = useCart();
  return (
    <PageHeader
      className="md:hidden"
      backHref={backHref}
      backLabel={backLabel}
      title={title}
      LinkComponent={Link}
      actions={
        <>
          <IconButton label="Search" href="/search/" LinkComponent={Link}>
            <Search size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </IconButton>
          <CartIconButton count={itemCount} onClick={openCart} />
        </>
      }
    />
  );
}
