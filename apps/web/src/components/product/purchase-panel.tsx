"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ShoppingBag } from "lucide-react";
import type { ProductDetail } from "@primegear/shared";
import { formatTaka } from "@primegear/shared/format";
import { bulkTierOptions } from "@primegear/shared/pricing";
import { Button } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { PriceBlock } from "@primegear/ui/price";
import { SelectableCard, SelectableGroup } from "@primegear/ui/selectable-card";
import { StickyActionBar, WhatsAppOrderLink } from "@primegear/ui/sticky-action-bar";
import { useCart } from "@/components/cart/cart-provider";
import { whatsappLink } from "@/lib/site";

type Variant = ProductDetail["variants"][number];

type Props = Pick<ProductDetail, "variants" | "bulkTiers"> & {
  productId: string;
  name: string;
  /** Absolute product URL, included in the WhatsApp message */
  url: string;
  /** Title, subtitle and rating: server-rendered, shown at the top of the white panel */
  header: ReactNode;
};

const LOW_STOCK = 5;

const pieces = (n: number) => `${n} ${n === 1 ? "piece" : "pieces"}`;

/**
 * Variant chips are labelled by their attribute when every variant has exactly one value of the
 * same attribute ("Body colour: White" with swatches); otherwise by variant name ("Option").
 */
function variantLabels(variants: Variant[]) {
  const attr = variants[0]?.attributes[0]?.attribute;
  const single =
    attr !== undefined &&
    variants.every((v) => v.attributes.length === 1 && v.attributes[0]!.attribute === attr);
  return {
    legend: single ? attr : "Option",
    label: (v: Variant) => (single ? v.attributes[0]!.value : v.name),
    swatch: (v: Variant) => (single ? (v.attributes[0]!.swatch ?? undefined) : undefined),
  };
}

/**
 * Price, stock, variant selector, bulk tier cards and order actions: inline on md+, the sticky
 * bar on phones. Add to cart adds the selected tier's quantity; the cart provider then offers
 * upsells or opens the drawer. Order now goes straight to the one-page checkout.
 */
export function PurchasePanel({ productId, name, url, variants, bulkTiers, header }: Props) {
  const router = useRouter();
  const { add, busy } = useCart();
  const firstInStock =
    variants.find((v) => v.isDefault && v.stock > 0) ?? variants.find((v) => v.stock > 0);
  const [variantId, setVariantId] = useState((firstInStock ?? variants[0])?.id ?? "");
  const [qty, setQty] = useState(1);

  const variant = variants.find((v) => v.id === variantId);
  const tiers = useMemo(
    () => (variant ? bulkTierOptions(variant.price, bulkTiers, variant.id) : []),
    [variant, bulkTiers],
  );
  if (!variant) return null;

  // The selected tier may not exist on a newly chosen variant: fall back to a single unit
  const tier = tiers.find((t) => t.minQty === qty) ?? tiers[0]!;
  const inStock = variant.stock > 0;
  const total = tier.unitPrice * tier.minQty;
  const labels = variantLabels(variants);
  const variantName = variants.length > 1 ? ` (${labels.label(variant)})` : "";

  const whatsapp = whatsappLink(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    `Hi, I want to order ${name}${variantName} × ${tier.minQty} = ${formatTaka(total)}\n${url}`,
  );

  const addToCart = () => add(variant.id, tier.minQty, { productId });
  const orderNow = async () => {
    const ok = await add(variant.id, tier.minQty, { productId, afterAdd: "none" });
    if (ok) router.push("/checkout/");
  };

  const bar = (position: "fixed" | "static", className: string) => (
    <StickyActionBar
      position={position}
      className={className}
      label={pieces(tier.minQty)}
      total={total}
      secondary={
        <Button
          size="icon"
          variant="outline"
          aria-label="Add to cart"
          disabled={!inStock || busy}
          onClick={addToCart}
        >
          <ShoppingBag size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
        </Button>
      }
      footer={whatsapp ? <WhatsAppOrderLink href={whatsapp} /> : undefined}
    >
      <Button size="lg" disabled={!inStock || busy} onClick={orderNow}>
        {inStock ? "Order now" : "Out of stock"}
      </Button>
    </StickyActionBar>
  );

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-b-panel bg-white px-4 pb-4.5 pt-1 shadow-card-soft md:rounded-panel md:p-6">
        {header}

        <PriceBlock amount={variant.price} compareAt={variant.comparePrice} size="xl" showSave />

        <p className="flex items-center gap-2 text-sm text-ink-700">
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full", inStock ? "bg-success" : "bg-danger")}
          />
          {inStock
            ? `${variant.stock <= LOW_STOCK ? `Only ${variant.stock} left` : "In stock"} · Cash on delivery · 7-day replacement`
            : "Out of stock"}
        </p>

        {variants.length > 1 && (
          <div className="mt-1.5 flex flex-col gap-2">
            <p className="text-copy font-semibold">
              {labels.legend}:{" "}
              <span className="font-medium text-ink-700">{labels.label(variant)}</span>
            </p>
            <SelectableGroup label={labels.legend}>
              {variants.map((v) => (
                <SelectableCard
                  key={v.id}
                  variant="chip"
                  selected={v.id === variantId}
                  onSelect={() => setVariantId(v.id)}
                  disabled={v.stock <= 0}
                  title={labels.label(v)}
                  swatch={labels.swatch(v)}
                />
              ))}
            </SelectableGroup>
          </div>
        )}
      </section>

      {tiers.length > 1 && (
        <section aria-labelledby="bulk-tiers" className="mx-4 mt-4 flex flex-col gap-2.5 md:mx-0">
          <h2 id="bulk-tiers" className="font-heading text-lg font-bold">
            Buy more, save more
          </h2>
          <SelectableGroup label="Quantity offer" columns={tiers.length === 2 ? 2 : 3}>
            {tiers.map((t) => (
              <SelectableCard
                key={t.minQty}
                variant="tier"
                selected={t.minQty === tier.minQty}
                onSelect={() => setQty(t.minQty)}
                tag={t.label ?? undefined}
                title={pieces(t.minQty)}
                value={`${formatTaka(t.unitPrice)}${t.minQty > 1 ? "/pc" : ""}`}
                detail={t.savePercent ? `Save ${t.savePercent}%` : "Regular price"}
              />
            ))}
          </SelectableGroup>
        </section>
      )}

      {/* md+: the same bar, in the flow under the options */}
      {bar("static", "mt-4 hidden rounded-panel border-0 shadow-card md:flex")}
      {/* Phones: pinned to the bottom (the bottom navigation is hidden on product pages) */}
      {bar("fixed", "md:hidden")}
    </>
  );
}
