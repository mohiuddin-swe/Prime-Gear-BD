"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { CartLine, CartView, UpsellOffer } from "@primegear/shared";
import { formatTaka } from "@primegear/shared/format";
import { Button, ButtonLink } from "@primegear/ui";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { CartSheet } from "@primegear/ui/overlay";
import { cartApi } from "@/lib/cart-api";
import { productPath } from "@/lib/site";
import { useCart } from "./cart-provider";
import { FreeDeliveryBar } from "./free-delivery-bar";

const stepBtn =
  "inline-flex size-11 items-center justify-center bg-white text-ink-900 disabled:opacity-40 active:bg-brand-50";

function whatsappLink(number: string, productName: string) {
  const digits = number.replace(/\D/g, "");
  const intl = digits.startsWith("880") ? digits : `88${digits}`; // 01XXXXXXXXX -> 8801XXXXXXXXX
  const text = `Hi Prime Gear BD, I'd like to place a bulk order for: ${productName}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

function BulkPrompt({ cart, line }: { cart: CartView; line: CartLine }) {
  const text = `Need more than ${cart.maxQtyPerProduct}? Order in bulk on WhatsApp`;
  return (
    <p className="flex items-start gap-2 rounded-btn bg-brand-50 p-2 text-base">
      <MessageCircle
        size={20}
        strokeWidth={ICON_STROKE}
        className="mt-0.5 shrink-0 text-brand-600"
        aria-hidden="true"
      />
      {cart.whatsappNumber ? (
        <a
          href={whatsappLink(cart.whatsappNumber, line.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center font-semibold text-brand-600 underline"
        >
          {text}
        </a>
      ) : (
        <span className="font-semibold">{text}</span>
      )}
    </p>
  );
}

function Line({
  line,
  cart,
  atLimit,
  showPrompt,
}: {
  line: CartLine;
  cart: CartView;
  atLimit: boolean;
  showPrompt: boolean;
}) {
  const { setQuantity, remove, busy, closeCart } = useCart();
  const overStock = line.quantity > line.stock;
  const bulkPercent =
    line.tier && line.tier.unitPrice < line.baseUnitPrice
      ? Math.round((1 - line.tier.unitPrice / line.baseUnitPrice) * 100)
      : 0;
  const detail = [line.variantName, `SKU ${line.sku}`].filter(Boolean).join(" · ");
  return (
    <li className="space-y-2 rounded-card bg-white p-3 shadow-card">
      <div className="flex gap-3">
        <Link
          href={productPath(line.slug)}
          onClick={closeCart}
          className="relative size-20 shrink-0 overflow-hidden rounded-btn bg-surface-sunken"
          aria-hidden="true"
          tabIndex={-1}
        >
          {line.imageUrl && (
            <Image src={line.imageUrl} alt="" fill sizes="80px" className="object-contain" />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-2">
            <Link
              href={productPath(line.slug)}
              onClick={closeCart}
              className="min-w-0 flex-1 text-base font-semibold leading-5"
            >
              <span className="line-clamp-2">{line.name}</span>
            </Link>
            <button
              type="button"
              className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-btn text-ink-400 active:bg-brand-50"
              aria-label={`Remove ${line.name}`}
              disabled={busy}
              onClick={() => remove(line.id)}
            >
              <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </button>
          </div>
          <p className="text-base text-ink-500">{detail}</p>
          {bulkPercent > 0 && (
            <p className="w-fit rounded-md bg-brand-50 px-2 py-0.5 text-sm font-semibold text-brand-800">
              Bulk {bulkPercent}% off applied
            </p>
          )}
          {line.upsellSource && line.upsellDiscount > 0 && (
            <p className="w-fit rounded-md bg-brand-50 px-2 py-0.5 text-sm font-semibold tabular-nums text-brand-800">
              Offer applied: -{formatTaka(line.upsellDiscount)}
            </p>
          )}
        </div>
      </div>

      {line.nextTier && (
        <p className="text-sm tabular-nums">
          Add {line.nextTier.addQty} more to pay {formatTaka(line.nextTier.unitPrice)} each
        </p>
      )}
      {overStock && (
        <p role="alert" className="text-sm font-semibold text-danger">
          Only {line.stock} left in stock
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center overflow-hidden rounded-btn border border-line-strong">
          <button
            type="button"
            className={stepBtn}
            aria-label={`Decrease quantity of ${line.name}`}
            disabled={busy || line.quantity <= 1}
            onClick={() => setQuantity(line.id, line.quantity - 1)}
          >
            <Minus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
          <span
            className="min-w-8 text-center text-base font-semibold tabular-nums"
            aria-live="polite"
          >
            {line.quantity}
          </span>
          <button
            type="button"
            className={stepBtn}
            aria-label={`Increase quantity of ${line.name}`}
            disabled={busy || atLimit || line.quantity >= line.stock}
            onClick={() => setQuantity(line.id, line.quantity + 1)}
          >
            <Plus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </div>
        <p className="font-heading text-lg font-extrabold tabular-nums">
          {line.savings > 0 && (
            <s className="mr-2 text-base font-normal text-ink-400">
              <span className="sr-only">Was </span>
              {formatTaka(line.lineTotal + line.savings)}
            </s>
          )}
          {formatTaka(line.lineTotal)}
        </p>
      </div>

      {showPrompt && <BulkPrompt cart={cart} line={line} />}
    </li>
  );
}

/** "Complete your setup": CART_UPSELL offers for the products in the cart, one tap to add. */
function SetupUpsells({ cart, open }: { cart: CartView; open: boolean }) {
  const { add, busy } = useCart();
  const [offers, setOffers] = useState<UpsellOffer[]>([]);
  const productKey = [...new Set(cart.items.map((l) => l.productId))].sort().join(",");

  useEffect(() => {
    if (!open || !productKey) return;
    let stale = false;
    Promise.all(
      productKey
        .split(",")
        .slice(0, 3)
        .map((id) => cartApi.upsells(id).catch(() => [] as UpsellOffer[])),
    ).then((lists) => {
      if (stale) return;
      const seen = new Set<string>();
      setOffers(lists.flat().filter((o) => !seen.has(o.productId) && seen.add(o.productId)));
    });
    return () => {
      stale = true;
    };
  }, [open, productKey]);

  const inCart = new Set(cart.items.map((l) => l.productId));
  const visible = offers.filter((o) => !inCart.has(o.productId)).slice(0, 4);
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="setup-heading" className="space-y-2">
      <h3 id="setup-heading" className="font-heading text-base font-bold">
        Complete your setup
      </h3>
      <ul className="grid grid-cols-2 gap-2">
        {visible.map((o) => (
          <li
            key={o.ruleId}
            className="flex flex-col gap-2 rounded-card bg-white p-2.5 shadow-card"
          >
            <span className="relative block h-18 overflow-hidden rounded-btn bg-surface-sunken">
              {o.imageUrl && (
                <Image src={o.imageUrl} alt="" fill sizes="160px" className="object-contain" />
              )}
            </span>
            <span className="line-clamp-2 text-base font-medium leading-5">{o.productName}</span>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              aria-label={`Add ${o.productName} for ${formatTaka(o.offerPrice)}`}
              onClick={() =>
                add(o.variantId, 1, {
                  productId: o.productId,
                  upsellRuleId: o.ruleId,
                  offerUpsells: false,
                })
              }
            >
              + Add {formatTaka(o.offerPrice)}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CartDrawer() {
  const { cart, drawerOpen, closeCart, notice, dismissNotice, busy } = useCart();
  const items = cart?.items ?? [];

  // Units per product across variants: the 10 cap is per product
  const perProduct = new Map<string, number>();
  for (const l of items)
    perProduct.set(l.productId, (perProduct.get(l.productId) ?? 0) + l.quantity);
  const lastLineOfProduct = new Map(items.map((l) => [l.productId, l.id]));
  const max = cart?.maxQtyPerProduct ?? 10;

  const limitHit = notice?.code === "CART_LIMIT_EXCEEDED";
  const lineForLimit = limitHit
    ? items.find((l) => l.id === lastLineOfProduct.get(l.productId))
    : undefined;

  return (
    <CartSheet
      open={drawerOpen}
      onClose={closeCart}
      title="Your cart"
      titleSuffix={cart && cart.itemCount > 0 ? `(${cart.itemCount})` : undefined}
      headerExtra={
        cart && items.length > 0 ? (
          <FreeDeliveryBar
            threshold={cart.freeDelivery.threshold}
            remaining={cart.freeDelivery.remaining}
            qualifies={cart.freeDelivery.qualifies}
          />
        ) : undefined
      }
      footer={
        cart && items.length > 0 ? (
          <div className="space-y-2">
            <dl className="space-y-2 text-base tabular-nums">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-semibold">{formatTaka(cart.pricing.total)}</dd>
              </div>
              {cart.pricing.discount > 0 && (
                <div className="flex justify-between font-semibold text-success-ink">
                  <dt>You save</dt>
                  <dd>{formatTaka(cart.pricing.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-500">
                <dt>Delivery</dt>
                <dd>{cart.freeDelivery.qualifies ? "Free" : "Calculated at checkout"}</dd>
              </div>
            </dl>
            <ButtonLink
              href="/checkout/"
              className={cn("mt-1 w-full", busy && "pointer-events-none opacity-60")}
              onClick={closeCart}
            >
              Checkout · {formatTaka(cart.pricing.total)}
            </ButtonLink>
            <p className="text-center text-base text-ink-500">Cash on delivery available</p>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {notice && (
          <div
            role="alert"
            className="space-y-2 rounded-card border border-danger bg-white p-3 text-base"
          >
            <p className="font-semibold">{notice.message}</p>
            {limitHit && cart && lineForLimit && <BulkPrompt cart={cart} line={lineForLimit} />}
            <button
              type="button"
              onClick={dismissNotice}
              className="min-h-11 font-semibold text-brand-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShoppingCart
              size={48}
              strokeWidth={ICON_STROKE}
              className="text-brand-600"
              aria-hidden="true"
            />
            <p className="text-base font-semibold">Your cart is empty</p>
            <ButtonLink href="/" variant="outline" onClick={closeCart}>
              Continue shopping
            </ButtonLink>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((line) => {
              const total = perProduct.get(line.productId) ?? 0;
              const atLimit = total >= max;
              return (
                <Line
                  key={line.id}
                  line={line}
                  cart={cart!}
                  atLimit={atLimit}
                  showPrompt={
                    atLimit && !limitHit && lastLineOfProduct.get(line.productId) === line.id
                  }
                />
              );
            })}
          </ul>
        )}

        {cart && items.length > 0 && <SetupUpsells cart={cart} open={drawerOpen} />}
      </div>
    </CartSheet>
  );
}
