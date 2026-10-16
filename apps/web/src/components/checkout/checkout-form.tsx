"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  LoaderCircle,
  Lock,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import type { ShippingZone } from "@primegear/shared";
import { shippingZoneForDistrict } from "@primegear/shared/districts";
import { formatTaka } from "@primegear/shared/format";
import { normalizeBdPhone } from "@primegear/shared/phone";
import { Button, ButtonLink } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { IconButton } from "@primegear/ui/icon-button";
import { SelectableCard, SelectableGroup } from "@primegear/ui/selectable-card";
import { Skeleton } from "@primegear/ui/skeleton";
import { StickyActionBar } from "@primegear/ui/sticky-action-bar";
import { useCart } from "@/components/cart/cart-provider";
import { CartApiError } from "@/lib/cart-api";
import { checkoutApi, type Quote } from "@/lib/checkout-api";
import { supportPhoneDisplay, SUPPORT_PHONE, supportWhatsappHref } from "@/lib/site";
import { getTrackingIds, track } from "@/lib/tracking";
import { DistrictSheet } from "./district-sheet";
import { OrderBump } from "./order-bump";
import { OrderSummary } from "./order-summary";

type Field = "name" | "phone" | "address" | "district";
type Errors = Partial<Record<Field, string>>;

// 52 px fields, 16 px text (no iOS zoom). Focus = 2 px brand ring without shifting the layout.
const control =
  "w-full rounded-btn border bg-white text-base text-ink-900 outline-none placeholder:text-ink-500 focus:border-brand-600 focus:ring-1 focus:ring-brand-600";
const input = cn(control, "h-13 scroll-mb-32 px-3.5");
const borderFor = (error?: string) => (error ? "border-danger" : "border-line-strong");
const labelCls = "block text-sm font-semibold text-ink-700";
const panel = "flex flex-col rounded-panel bg-white p-4 shadow-card";
const panelTitle = "font-heading text-lead font-bold";

const DHAKA = "Dhaka";

// Online payments arrive with the PaymentProvider work; until then only COD can be chosen
const PAYMENTS = [
  { id: "cod", label: "Cash on delivery", sub: "Pay when you receive it", chip: "COD" },
  { id: "bkash", label: "bKash", sub: "Coming soon", chip: "bKash" },
  { id: "nagad", label: "Nagad", sub: "Coming soon", chip: "Nagad" },
  { id: "rocket", label: "Rocket", sub: "Coming soon", chip: "Rocket" },
] as const;

function validate(f: { name: string; phone: string; address: string; district: string }): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "Enter your name";
  if (!normalizeBdPhone(f.phone)) e.phone = "Enter a valid mobile number, like 01712345678";
  if (f.address.trim().length < 10) e.address = "Enter your full address (house, road, area)";
  if (!f.district) e.district = "Choose your district";
  return e;
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-sm text-danger">
      {error}
    </p>
  );
}

/** "Have a coupon?" link that opens a code field. Codes are checked by the team on the confirmation call. */
function CouponLink({ value, onApply }: { value: string; onApply: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!open && !value) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="-mb-2 min-h-11 self-start text-sm font-semibold text-brand-600"
      >
        Have a coupon?
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 border-t border-surface-sunken pt-3">
      <label htmlFor="coupon" className={labelCls}>
        Coupon code
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          autoComplete="off"
          autoCapitalize="characters"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // Enter here applies the code, it doesn't place the order
              onApply(draft.trim());
            }
          }}
          className={cn(control, "h-12 min-w-0 flex-1 border-line-strong px-3.5 uppercase")}
          placeholder="Enter code"
        />
        <Button variant="outline" onClick={() => onApply(draft.trim())}>
          Apply
        </Button>
      </div>
      {value && (
        <p className="text-sm text-ink-500" role="status">
          We&apos;ll check <strong className="font-semibold text-ink-900">{value}</strong> and apply
          it on your confirmation call.
        </p>
      )}
    </div>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { cart, refresh, openCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [coupon, setCoupon] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sheet, setSheet] = useState<{ zone?: ShippingZone } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // One key per checkout attempt: a retried submit returns the same order instead of a second one
  const idempotencyKey = useRef(crypto.randomUUID());
  const submitLock = useRef(false);
  const placed = useRef(false);
  const startedTracking = useRef(false);
  const quoteSeq = useRef(0);
  const serverErrorRef = useRef<HTMLParagraphElement>(null);

  const items = cart?.items ?? [];
  const cartSignature = items.map((i) => `${i.id}:${i.quantity}`).join(",");

  // Server-side totals: re-quoted whenever the district or the cart changes
  useEffect(() => {
    if (!cartSignature) return;
    const seq = ++quoteSeq.current;
    checkoutApi
      .quote(district || undefined)
      .then((q) => seq === quoteSeq.current && setQuote(q))
      .catch(() => undefined);
  }, [district, cartSignature]);

  // GA4 begin_checkout, once, when the cart is known
  useEffect(() => {
    if (!cart || cart.items.length === 0 || startedTracking.current) return;
    startedTracking.current = true;
    track("begin_checkout", {
      currency: "BDT",
      value: cart.pricing.total,
      items: cart.items.map((i) => ({
        item_id: i.sku,
        item_name: i.name,
        item_variant: i.variantName,
        price: i.unitPrice,
        quantity: i.quantity,
      })),
    });
  }, [cart]);

  // Abandoned-checkout capture: once name + a valid phone exist, save (debounced) as they keep typing
  useEffect(() => {
    const normalized = normalizeBdPhone(phone);
    if (placed.current || name.trim().length < 2 || !normalized || !cartSignature) return;
    const timer = setTimeout(() => {
      if (placed.current) return;
      checkoutApi
        .saveIncomplete({
          name: name.trim(),
          phone: normalized,
          address: address.trim() || undefined,
          district: district || undefined,
          thana: thana.trim() || undefined,
          tracking: getTrackingIds(),
        })
        .catch(() => undefined); // best effort: never bothers the customer
    }, 1500);
    return () => clearTimeout(timer);
  }, [name, phone, address, district, thana, cartSignature]);

  useEffect(() => {
    if (serverError) serverErrorRef.current?.scrollIntoView({ block: "center" });
  }, [serverError]);

  const focusFirstError = (e: Errors) => {
    const first = (["name", "phone", "address", "district"] as const).find((f) => e[f]);
    if (first) document.getElementById(first)?.focus();
  };

  const chooseDistrict = (d: string) => {
    setDistrict(d);
    setErrors((prev) => ({ ...prev, district: undefined }));
  };

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (submitLock.current) return; // double tap
    const found = validate({ name, phone, address, district });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setServerError(null);
    try {
      const result = await checkoutApi.createOrder({
        name: name.trim(),
        phone: normalizeBdPhone(phone)!,
        address: address.trim(),
        district: district as never,
        thana: thana.trim() || undefined,
        // No online coupon check yet: the code reaches the call agent with the order
        note: coupon ? `Coupon: ${coupon}` : undefined,
        paymentMethod: "COD",
        idempotencyKey: idempotencyKey.current,
        tracking: getTrackingIds(),
      });
      placed.current = true;
      // Placing an order is a LEAD (not a purchase). The same event_id is used server-side for dedup.
      track(
        "generate_lead",
        {
          currency: "BDT",
          value: result.total,
          user_data: {
            phone: normalizeBdPhone(phone),
            name: name.trim(),
            district,
            external_id: result.customerId,
          },
        },
        result.leadEventId,
      );
      void refresh();
      router.push(`/order/${result.orderNumber}/`); // stays "submitting" until the page changes
    } catch (err) {
      submitLock.current = false;
      setSubmitting(false);
      setServerError(
        err instanceof CartApiError
          ? err.code === "RATE_LIMITED"
            ? "Too many attempts. Please wait a few minutes, or call us to place your order."
            : err.message
          : "Something went wrong. Please try again.",
      );
      void refresh();
    }
  }

  // ───────────── States before the form ─────────────
  if (cart === null) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full rounded-panel" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <ShoppingCart
          size={48}
          strokeWidth={ICON_STROKE}
          className="text-brand-600"
          aria-hidden="true"
        />
        <h1 className="font-heading text-2xl font-extrabold">Your cart is empty</h1>
        <p className="text-base">Add something to your cart to check out.</p>
        <ButtonLink href="/">Continue shopping</ButtonLink>
      </div>
    );
  }

  const shown: Quote = quote ?? { ...cart, zone: null };
  const total = shown.pricing.total;
  const districtChosen = !!district && shown.pricing.shippingFee !== null;
  const zone = district ? shippingZoneForDistrict(district) : null;
  const phoneValid = !!normalizeBdPhone(phone);

  const areas = [
    {
      id: "INSIDE_DHAKA" as const,
      label: "Inside Dhaka",
      fee: shown.shipping.insideDhaka,
      eta: shown.deliveryEta.insideDhaka,
    },
    {
      id: "OUTSIDE_DHAKA" as const,
      label: "Outside Dhaka",
      fee: shown.shipping.outsideDhaka,
      eta: shown.deliveryEta.outsideDhaka,
    },
  ];
  // Inside Dhaka is one district, so the card sets it; Outside Dhaka asks which district
  const pickArea = (id: ShippingZone) => {
    if (zone === id) return;
    if (id === "INSIDE_DHAKA") chooseDistrict(DHAKA);
    else setSheet({ zone: "OUTSIDE_DHAKA" });
  };

  const secure = (
    <span className="flex items-center gap-1.5 text-caption font-semibold text-success-ink">
      <Lock size={16} strokeWidth={2} aria-hidden="true" />
      Secure
    </span>
  );
  const placeLabel = submitting ? "Placing order…" : "Place order";
  const spinner = submitting ? (
    <LoaderCircle
      className="animate-spin motion-reduce:animate-none"
      size={20}
      aria-hidden="true"
    />
  ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="pb-32 lg:pb-12">
      {/* Phones: own header (the site header is hidden here), back opens the cart drawer */}
      <header className="flex items-center gap-0.5 bg-white py-2 pl-1 pr-4 shadow-hairline md:hidden">
        <IconButton label="Back to cart" onClick={openCart}>
          <ChevronLeft size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
        </IconButton>
        <h1 className="flex-1 font-heading text-lg font-bold tracking-heading">Checkout</h1>
        {secure}
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-4 md:px-6 md:pt-6">
        <div className="mb-4 hidden items-center gap-4 md:flex">
          <h1 className="font-heading text-3xl font-extrabold tracking-heading">Checkout</h1>
          {secure}
          <button
            type="button"
            onClick={openCart}
            className="ml-auto min-h-11 text-base font-semibold text-brand-600"
          >
            Edit cart
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="flex flex-col gap-4">
            <section aria-labelledby="delivery-title" className={cn(panel, "gap-3.5")}>
              <h2 id="delivery-title" className={panelTitle}>
                Delivery details
              </h2>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className={labelCls}>
                  Your name
                </label>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className={cn(input, borderFor(errors.name))}
                  placeholder="Full name"
                />
                <FieldError id="name" error={errors.name} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className={labelCls}>
                  Phone number
                </label>
                <div
                  className={cn(
                    "flex h-13 scroll-mb-32 items-center overflow-hidden rounded-btn border bg-white focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600",
                    borderFor(errors.phone),
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-full items-center bg-brand-50 px-3 text-copy font-semibold text-brand-800"
                  >
                    +88
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    onBlur={() => {
                      const n = normalizeBdPhone(phone);
                      if (n) setPhone(n); // show the number the way we will store it
                    }}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error phone-hint" : "phone-hint"}
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-base tabular-nums text-ink-900 outline-none placeholder:text-ink-500"
                    placeholder="01XXXXXXXXX"
                  />
                  {phoneValid && (
                    <Check
                      size={20}
                      strokeWidth={2}
                      className="mr-3 shrink-0 text-success"
                      aria-label="Valid number"
                    />
                  )}
                </div>
                <FieldError id="phone" error={errors.phone} />
                <p id="phone-hint" className="text-caption text-ink-500">
                  We&apos;ll call this number to confirm your order.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="address" className={labelCls}>
                  Full address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? "address-error" : undefined}
                  className={cn(control, "resize-none p-3.5", borderFor(errors.address))}
                  placeholder="House, road, area"
                />
                <FieldError id="address" error={errors.address} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span id="district-label" className={labelCls}>
                    District
                  </span>
                  <button
                    type="button"
                    id="district"
                    onClick={() => setSheet({})}
                    aria-haspopup="dialog"
                    aria-labelledby="district-label district"
                    aria-describedby={errors.district ? "district-error" : undefined}
                    className={cn(
                      input,
                      "flex items-center justify-between gap-1 px-3 text-left",
                      borderFor(errors.district),
                    )}
                  >
                    <span className={cn("truncate", !district && "text-ink-500")}>
                      {district || "Select"}
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={ICON_STROKE}
                      className="shrink-0 text-ink-500"
                      aria-hidden="true"
                    />
                  </button>
                  <FieldError id="district" error={errors.district} />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="thana" className={labelCls}>
                    Thana <span className="sr-only">(optional)</span>
                  </label>
                  <input
                    id="thana"
                    name="thana"
                    autoComplete="address-level3"
                    value={thana}
                    onChange={(e) => setThana(e.target.value)}
                    className={cn(input, "px-3", borderFor())}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </section>

            <section aria-labelledby="area-title" className={cn(panel, "gap-3")}>
              <h2 id="area-title" className={panelTitle}>
                Delivery area
              </h2>
              <SelectableGroup label="Delivery area" columns={2}>
                {areas.map((a) => (
                  <SelectableCard
                    key={a.id}
                    variant="option"
                    selected={zone === a.id}
                    onSelect={() => pickArea(a.id)}
                    title={a.label}
                    detail={
                      <span className="tabular-nums">
                        {shown.freeDelivery.qualifies ? "Free" : formatTaka(a.fee)} · {a.eta}
                      </span>
                    }
                  />
                ))}
              </SelectableGroup>
            </section>

            <section aria-labelledby="payment-title" className={cn(panel, "gap-2.5")}>
              <h2 id="payment-title" className={panelTitle}>
                Payment
              </h2>
              <SelectableGroup label="Payment method" columns={1}>
                {PAYMENTS.map((p) => (
                  <SelectableCard
                    key={p.id}
                    variant="payment"
                    selected={p.id === "cod"}
                    onSelect={() => undefined}
                    disabled={p.id !== "cod"}
                    title={p.label}
                    detail={p.sub}
                    chip={{ label: p.chip, brand: p.id }}
                  />
                ))}
              </SelectableGroup>
            </section>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
            <OrderBump />
            <OrderSummary quote={shown} districtChosen={districtChosen}>
              <CouponLink value={coupon} onApply={setCoupon} />
            </OrderSummary>

            <p className="flex items-center gap-2.5 px-1 text-sm leading-copy text-ink-500">
              <ShieldCheck
                size={20}
                strokeWidth={ICON_STROKE}
                className="shrink-0 text-brand-600"
                aria-hidden="true"
              />
              You&apos;ll get a confirmation call before we ship. Pay only when it arrives.
            </p>

            <div className="flex items-center gap-2.5 rounded-card bg-white p-3.5 shadow-card-soft">
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-caption text-ink-500">Questions about your order?</span>
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="font-heading text-lead font-bold tabular-nums text-ink-900"
                >
                  {supportPhoneDisplay}
                </a>
              </span>
              {supportWhatsappHref && (
                <a
                  href={supportWhatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 items-center gap-1.5 rounded-btn border border-success px-3.5 text-copy font-semibold text-success-ink active:bg-success/10"
                >
                  <MessageCircle size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  WhatsApp
                </a>
              )}
            </div>

            {serverError && (
              <p
                ref={serverErrorRef}
                role="alert"
                className="rounded-card border border-danger bg-white p-3 text-base font-semibold"
              >
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="hidden w-full lg:inline-flex"
            >
              {spinner}
              {submitting ? placeLabel : `Place order · ${formatTaka(total)}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Phones and tablets: total and the order button stay pinned to the bottom */}
      <StickyActionBar label="Total" total={total} totalSize="lg" className="lg:hidden">
        <Button type="submit" size="lg" disabled={submitting}>
          {spinner}
          {placeLabel}
        </Button>
      </StickyActionBar>

      <DistrictSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        value={district}
        zone={sheet?.zone}
        onSelect={chooseDistrict}
      />
    </form>
  );
}
