"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { ImageOff, LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import { BD_DISTRICTS } from "@primegear/shared/districts";
import { formatTaka } from "@primegear/shared/format";
import {
  ADMIN_MAX_LINE_QTY,
  type AdminShippingFees,
  type AdminVariantOption,
} from "@primegear/shared/orders";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { QuantityStepper } from "@primegear/ui/quantity-stepper";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { Field, Select, TextArea, TextInput } from "../ui";

export type EditLine = {
  variantId: string;
  name: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
  /** Units this line may hold: stock left + what the order already holds (null = unknown) */
  available: number | null;
};
export type ItemsDraft = { lines: EditLine[]; discount: number; shippingFee: number };

export const draftSubtotal = (d: ItemsDraft) => d.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
export const draftTotal = (d: ItemsDraft) => draftSubtotal(d) - d.discount + d.shippingFee;

/** Body for PUT /items and POST /convert */
export const draftBody = (d: ItemsDraft) => ({
  items: d.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
  discount: d.discount,
  shippingFee: d.shippingFee,
});

/** The checkout's delivery rule, for a suggested fee when the district changes */
export function suggestedFee(fees: AdminShippingFees, district: string, goods: number) {
  if (fees.freeDeliveryThreshold && goods >= fees.freeDeliveryThreshold) return 0;
  return district === "Dhaka" ? fees.insideDhaka : fees.outsideDhaka;
}

/** Whole-taka input: digits only, 16 px, numeric keypad */
function MoneyInput({
  id,
  value,
  onChange,
  label,
  className,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-ink-500">
        ৳
      </span>
      <TextInput
        id={id}
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(value)}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
          onChange(Math.min(n, 10_000_000));
        }}
        className="pl-7 tabular-nums"
      />
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-sunken text-ink-400">
      {url ? (
        <Image src={url} alt="" fill sizes="56px" className="object-contain" />
      ) : (
        <ImageOff size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      )}
    </span>
  );
}

export function ItemsEditor({
  value,
  onChange,
}: {
  value: ItemsDraft;
  onChange: (next: ItemsDraft) => void;
}) {
  const uid = useId();
  const setLine = (i: number, patch: Partial<EditLine>) =>
    onChange({ ...value, lines: value.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const subtotal = draftSubtotal(value);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line">
        {value.lines.map((l, i) => {
          const short = l.available !== null && l.quantity > l.available;
          return (
            <li key={l.variantId} className="flex flex-col gap-3 py-3 first:pt-0">
              <div className="flex items-start gap-3">
                <Thumb url={l.imageUrl} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 text-copy font-semibold text-ink-950">{l.name}</span>
                  <span className="text-caption text-ink-500">
                    {[l.variantName, l.sku].filter(Boolean).join(" · ")}
                  </span>
                  {short && (
                    <span className="text-caption font-semibold text-danger-ink">Only {l.available} available</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, lines: value.lines.filter((_, j) => j !== i) })}
                  aria-label={`Remove ${l.name}`}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-btn text-ink-500 active:bg-danger/10 active:text-danger-ink"
                >
                  <Trash2 size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <QuantityStepper
                  value={l.quantity}
                  onChange={(q) => setLine(i, { quantity: q })}
                  max={ADMIN_MAX_LINE_QTY}
                  label={`Quantity of ${l.name}`}
                />
                <MoneyInput
                  id={`${uid}-price-${i}`}
                  label={`Unit price of ${l.name}`}
                  value={l.unitPrice}
                  onChange={(v) => setLine(i, { unitPrice: v })}
                  className="w-32"
                />
                <span className="ml-auto font-bold tabular-nums text-ink-950">{formatTaka(l.quantity * l.unitPrice)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <VariantPicker
        exclude={value.lines.map((l) => l.variantId)}
        onPick={(v) =>
          onChange({
            ...value,
            lines: [
              ...value.lines,
              {
                variantId: v.variantId,
                name: v.productName,
                variantName: v.variantName,
                sku: v.sku,
                quantity: 1,
                unitPrice: v.price,
                imageUrl: v.imageUrl,
                available: v.stock,
              },
            ],
          })
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount" id={`${uid}-discount`} error={value.discount > subtotal ? "More than the subtotal" : undefined}>
          <MoneyInput id={`${uid}-discount`} value={value.discount} onChange={(v) => onChange({ ...value, discount: v })} />
        </Field>
        <Field label="Delivery fee" id={`${uid}-fee`}>
          <MoneyInput id={`${uid}-fee`} value={value.shippingFee} onChange={(v) => onChange({ ...value, shippingFee: v })} />
        </Field>
      </div>
      <Totals subtotal={subtotal} discount={value.discount} shippingFee={value.shippingFee} />
    </div>
  );
}

export function Totals({ subtotal, discount, shippingFee }: { subtotal: number; discount: number; shippingFee: number }) {
  const row = "flex justify-between gap-3 text-copy";
  return (
    <dl className="flex flex-col gap-1.5 rounded-btn bg-surface p-3.5">
      <div className={row}>
        <dt className="text-ink-700">Subtotal</dt>
        <dd className="tabular-nums text-ink-900">{formatTaka(subtotal)}</dd>
      </div>
      {discount > 0 && (
        <div className={row}>
          <dt className="text-ink-700">Discount</dt>
          <dd className="tabular-nums text-success-ink">−{formatTaka(discount)}</dd>
        </div>
      )}
      <div className={row}>
        <dt className="text-ink-700">Delivery</dt>
        <dd className="tabular-nums text-ink-900">{shippingFee === 0 ? "Free" : formatTaka(shippingFee)}</dd>
      </div>
      <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2">
        <dt className="font-bold text-ink-950">Total (COD)</dt>
        <dd className="font-heading text-lead font-extrabold tabular-nums text-ink-950">
          {formatTaka(subtotal - discount + shippingFee)}
        </dd>
      </div>
    </dl>
  );
}

/** Search the catalog by name or SKU and add a variant at its current price. */
function VariantPicker({ exclude, onPick }: { exclude: string[]; onPick: (v: AdminVariantOption) => void }) {
  const uid = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ term: string; items: AdminVariantOption[] }>({ term: "", items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await adminApi.variantOptions(term);
        if (live) setResults({ term, items: found });
      } catch (err) {
        if (live) setError(errorMessage(err));
      } finally {
        if (live) setLoading(false);
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  const term = q.trim();
  const shown = term.length >= 2 && results.term === term ? results.items.filter((r) => !exclude.includes(r.variantId)) : [];

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${uid}-q`} className="text-sm font-semibold text-ink-700">
        Add an item
      </label>
      <div className="flex h-12 items-center gap-2.5 rounded-btn border border-line-strong bg-white px-3.5 text-ink-500 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
        {loading ? (
          <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <Search size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
        )}
        <input
          id={`${uid}-q`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Product name or SKU"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
        />
      </div>
      {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
      {shown.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-btn border border-line">
          {shown.map((v) => (
            <li key={v.variantId}>
              <button
                type="button"
                disabled={v.stock === 0}
                onClick={() => {
                  onPick(v);
                  setQ("");
                }}
                className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left active:bg-brand-50 disabled:opacity-50"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-copy font-semibold text-ink-950">
                    {v.productName}
                    {v.variantName && <span className="font-normal text-ink-700"> · {v.variantName}</span>}
                  </span>
                  <span className={cn("text-caption", v.stock === 0 ? "font-semibold text-danger-ink" : "text-ink-500")}>
                    {v.sku} · {v.stock === 0 ? "Out of stock" : `${v.stock} in stock`}
                  </span>
                </span>
                <span className="font-bold tabular-nums text-ink-950">{formatTaka(v.price)}</span>
                <Plus size={20} strokeWidth={ICON_STROKE} className="shrink-0 text-brand-600" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {results.term === term && term.length >= 2 && !loading && !error && shown.length === 0 && (
        <p className="text-sm text-ink-500">No matching items.</p>
      )}
    </div>
  );
}

export type AddressDraft = { name: string; phone: string; address: string; district: string; thana: string };

export function AddressFields({
  value,
  onChange,
  errors = {},
}: {
  value: AddressDraft;
  onChange: (next: AddressDraft) => void;
  errors?: Partial<Record<keyof AddressDraft, string>>;
}) {
  const uid = useId();
  const set = (patch: Partial<AddressDraft>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name" id={`${uid}-name`} error={errors.name}>
        <TextInput id={`${uid}-name`} value={value.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" error={errors.name} />
      </Field>
      <Field label="Phone" id={`${uid}-phone`} error={errors.phone}>
        <TextInput
          id={`${uid}-phone`}
          type="tel"
          inputMode="tel"
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
          autoComplete="off"
          error={errors.phone}
        />
      </Field>
      <Field label="Address" id={`${uid}-address`} error={errors.address} className="md:col-span-2">
        <TextArea id={`${uid}-address`} value={value.address} onChange={(e) => set({ address: e.target.value })} className="min-h-20" error={errors.address} />
      </Field>
      <Field label="District" id={`${uid}-district`} error={errors.district}>
        <Select id={`${uid}-district`} value={value.district} onChange={(e) => set({ district: e.target.value })} aria-invalid={errors.district ? true : undefined}>
          <option value="">Choose district</option>
          {BD_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Thana (optional)" id={`${uid}-thana`} error={errors.thana}>
        <TextInput id={`${uid}-thana`} value={value.thana} onChange={(e) => set({ thana: e.target.value })} autoComplete="off" />
      </Field>
    </div>
  );
}

/** First message per top-level field from a Zod issue list */
export function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
}
