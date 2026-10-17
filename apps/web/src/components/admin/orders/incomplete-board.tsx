"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LoaderCircle, MapPin, Phone } from "lucide-react";
import { formatTaka } from "@primegear/shared/format";
import {
  orderAddressSchema,
  type AdminIncompleteOrder,
  type AdminShippingFees,
} from "@primegear/shared/orders";
import { Button } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { orderHref, telHref, timeAgo } from "@/lib/admin-format";
import { ConfirmSheet } from "../confirm-sheet";
import { Field, TextArea } from "../ui";
import {
  AddressFields,
  ItemsEditor,
  draftBody,
  draftSubtotal,
  draftTotal,
  issuesToErrors,
  suggestedFee,
  type AddressDraft,
  type ItemsDraft,
} from "./order-editors";

const big = "h-14 w-full rounded-btn text-base font-bold md:h-12";

export function IncompleteBoard({ checkouts, fees }: { checkouts: AdminIncompleteOrder[]; fees: AdminShippingFees }) {
  const [converting, setConverting] = useState<AdminIncompleteOrder | null>(null);
  return (
    <>
      <p className="text-sm text-ink-500">
        Visitors who typed their phone at checkout but did not place the order. Call them, then convert.
      </p>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checkouts.map((c) => (
          <li key={c.id}>
            <IncompleteCard checkout={c} onConvert={() => setConverting(c)} />
          </li>
        ))}
      </ul>
      {converting && (
        <ConvertSheet checkout={converting} fees={fees} onClose={() => setConverting(null)} />
      )}
    </>
  );
}

function IncompleteCard({ checkout: c, onConvert }: { checkout: AdminIncompleteOrder; onConvert: () => void }) {
  const router = useRouter();
  const [discardOpen, setDiscardOpen] = useState(false);
  const [contacted, setContacted] = useState(c.status === "CONTACTED");
  const summary = c.items
    .map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ""}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`)
    .join(", ");

  // The dialer opens straight away; marking the checkout contacted happens alongside
  const markContacted = () => {
    if (contacted) return;
    setContacted(true);
    adminApi.setIncompleteStatus(c.id, "CONTACTED").catch(() => setContacted(false));
  };

  return (
    <article className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate font-heading text-lead font-bold text-ink-950">{c.name || "No name yet"}</h3>
          <p className="text-copy font-semibold tabular-nums text-ink-900">{c.phone ?? "No phone"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-heading text-lead font-extrabold tabular-nums text-ink-950">{formatTaka(c.subtotal)}</span>
          <span
            className={cn(
              "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold",
              contacted ? "bg-surface-sunken text-ink-700" : "bg-brand-50 text-brand-800",
            )}
          >
            {contacted ? "Contacted" : "Not called"}
          </span>
        </div>
      </div>
      <p className="line-clamp-2 text-copy text-ink-700">{summary || "Cart is empty"}</p>
      {(c.district || c.address) && (
        <p className="flex items-center gap-1.5 text-caption text-ink-500">
          <MapPin size={16} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{[c.address, c.thana, c.district].filter(Boolean).join(", ")}</span>
        </p>
      )}
      <p className="text-caption text-ink-500">
        Last active <span suppressHydrationWarning>{timeAgo(c.lastActivityAt)}</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {c.phone && (
          <a
            href={telHref(c.phone)}
            onClick={markContacted}
            className={cn(big, "inline-flex items-center justify-center gap-2 border border-line-strong bg-white text-ink-900 active:bg-brand-50")}
          >
            <Phone size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Call
          </a>
        )}
        <Button onClick={onConvert} disabled={c.items.length === 0} className={cn(big, !c.phone && "col-span-2")}>
          Convert to order
        </Button>
      </div>
      <button
        type="button"
        onClick={() => setDiscardOpen(true)}
        className="min-h-11 self-center px-3 text-sm font-semibold text-ink-500 active:text-danger-ink"
      >
        Discard
      </button>
      <ConfirmSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard this checkout?"
        message="It leaves the incomplete list. Use this for junk or numbers that are not real."
        confirmLabel="Discard"
        onConfirm={async () => {
          await adminApi.setIncompleteStatus(c.id, "DISCARDED");
          router.refresh();
        }}
      />
    </article>
  );
}

function ConvertSheet({
  checkout: c,
  fees,
  onClose,
}: {
  checkout: AdminIncompleteOrder;
  fees: AdminShippingFees;
  onClose: () => void;
}) {
  const router = useRouter();
  const [address, setAddress] = useState<AddressDraft>({
    name: c.name ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    district: c.district ?? "",
    thana: c.thana ?? "",
  });
  const goods = c.items.reduce((s, i) => s + i.lineTotal, 0);
  const [items, setItems] = useState<ItemsDraft>(() => ({
    lines: c.items.map((i) => ({
      variantId: i.variantId,
      name: i.name,
      variantName: i.variantName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      imageUrl: null,
      available: null,
    })),
    // Upsell savings in the cart live in line totals: carry them over as the order discount
    discount: Math.max(0, c.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) - goods),
    shippingFee: c.district ? suggestedFee(fees, c.district, goods) : fees.outsideDhaka,
  }));
  const [feeTouched, setFeeTouched] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onAddress = (next: AddressDraft) => {
    if (next.district !== address.district && next.district && !feeTouched) {
      setItems((d) => ({ ...d, shippingFee: suggestedFee(fees, next.district, draftSubtotal(d) - d.discount) }));
    }
    setAddress(next);
  };

  const submit = async () => {
    setError(null);
    const parsed = orderAddressSchema.safeParse(address);
    if (!parsed.success) return setErrors(issuesToErrors(parsed.error.issues));
    setErrors({});
    if (items.lines.length === 0) return setError("Add at least one item");
    setBusy(true);
    try {
      const created = await adminApi.convertIncomplete(c.id, {
        ...parsed.data,
        ...draftBody(items),
        note: note.trim() || undefined,
      });
      router.push(orderHref(created.orderId));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Convert to order"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger-ink">
              {error}
            </p>
          )}
          <Button size="lg" onClick={submit} disabled={busy} className="w-full">
            {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
            Create order · {formatTaka(draftTotal(items))}
            <ArrowRight size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-base font-bold text-ink-950">Customer</h3>
          <AddressFields value={address} onChange={onAddress} errors={errors} />
        </section>
        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-base font-bold text-ink-950">Items</h3>
          <ItemsEditor
            value={items}
            onChange={(next) => {
              if (next.shippingFee !== items.shippingFee) setFeeTouched(true);
              setItems(next);
            }}
          />
        </section>
        <Field label="Order note (optional)" id={`convert-note-${c.id}`}>
          <TextArea id={`convert-note-${c.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-20" />
        </Field>
        <p className="text-caption text-ink-500">
          The order is created as Pending (source: phone) with the visitor&apos;s ad identifiers. Confirm it after.
        </p>
      </div>
    </BottomSheet>
  );
}
