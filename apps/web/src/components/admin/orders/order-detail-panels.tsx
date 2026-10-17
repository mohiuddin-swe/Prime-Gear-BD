"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageOff, LoaderCircle, MessageSquareText, Pencil, Phone, PhoneMissed } from "lucide-react";
import { formatTaka } from "@primegear/shared/format";
import {
  orderAddressSchema,
  orderItemsInputSchema,
  type AdminOrderDetail,
} from "@primegear/shared/orders";
import { Button } from "@primegear/ui/button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { formatDateTime, telHref } from "@/lib/admin-format";
import { FormStatus, Panel, TextArea } from "../ui";
import {
  AddressFields,
  ItemsEditor,
  Totals,
  draftBody,
  issuesToErrors,
  type AddressDraft,
  type ItemsDraft,
} from "./order-editors";

type Status = { kind: "ok" | "error"; text: string } | null;

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="ghost" onClick={onClick} aria-label={label} className="h-11 px-3 md:h-11">
      <Pencil size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
      Edit
    </Button>
  );
}

function SaveBar({ busy, onSave, onCancel }: { busy: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:flex md:justify-end">
      <Button variant="outline" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button onClick={onSave} disabled={busy}>
        {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
        Save
      </Button>
    </div>
  );
}

// ───────────── Items ─────────────

function toDraft(order: AdminOrderDetail): ItemsDraft {
  const lines = order.items
    .filter((i) => i.variantId)
    .map((i) => ({
      variantId: i.variantId!,
      name: i.productName,
      variantName: i.variantName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      imageUrl: i.imageUrl,
      // The order already holds its own units
      available: i.stock === null ? null : i.stock + i.quantity,
    }));
  // Keep today's total when nothing changes: whatever line prices don't explain is the discount
  const gross = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  return {
    lines,
    discount: Math.max(0, gross - (order.total - order.shippingFee)),
    shippingFee: order.shippingFee,
  };
}

export function OrderItemsPanel({ order, canEdit }: { order: AdminOrderDetail; canEdit: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ItemsDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const orphaned = order.items.some((i) => !i.variantId);

  const save = async () => {
    if (!draft) return;
    const parsed = orderItemsInputSchema.safeParse(draftBody(draft));
    if (!parsed.success) return setStatus({ kind: "error", text: parsed.error.issues[0]!.message });
    setBusy(true);
    setStatus(null);
    try {
      await adminApi.updateOrderItems(order.id, draftBody(draft));
      setDraft(null);
      setStatus({ kind: "ok", text: "Items saved" });
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const count = order.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <Panel
      title="Items"
      description={`${count} ${count === 1 ? "item" : "items"}`}
      actions={
        canEdit && !draft && !orphaned && <EditButton onClick={() => setDraft(toDraft(order))} label="Edit items" />
      }
    >
      {canEdit && orphaned && (
        <p className="text-sm text-ink-500">An item&apos;s product was deleted from the catalog, so items can&apos;t be edited here.</p>
      )}
      {draft ? (
        <>
          <ItemsEditor value={draft} onChange={setDraft} />
          <SaveBar busy={busy} onSave={save} onCancel={() => setDraft(null)} />
        </>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3 first:pt-0">
                <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-sunken text-ink-400">
                  {i.imageUrl ? (
                    <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-contain" />
                  ) : (
                    <ImageOff size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 text-copy font-semibold text-ink-950">{i.productName}</span>
                  <span className="text-caption text-ink-500">
                    {[i.variantName, i.sku].filter(Boolean).join(" · ")}
                  </span>
                  <span className="text-caption tabular-nums text-ink-700">
                    {i.quantity} × {formatTaka(i.unitPrice)}
                  </span>
                </span>
                <span className="font-bold tabular-nums text-ink-950">{formatTaka(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <Totals subtotal={order.subtotal} discount={order.discount} shippingFee={order.shippingFee} />
        </>
      )}
      <FormStatus status={status} />
    </Panel>
  );
}

// ───────────── Customer and delivery ─────────────

export function OrderAddressPanel({ order, canEdit }: { order: AdminOrderDetail; canEdit: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AddressDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const save = async () => {
    if (!draft) return;
    const parsed = orderAddressSchema.safeParse(draft);
    if (!parsed.success) return setErrors(issuesToErrors(parsed.error.issues));
    setErrors({});
    setBusy(true);
    setStatus(null);
    try {
      const updated = await adminApi.updateOrderAddress(order.id, parsed.data);
      setDraft(null);
      setStatus({
        kind: "ok",
        text:
          updated.shippingFee !== order.shippingFee
            ? `Saved. Delivery fee is now ${formatTaka(updated.shippingFee)}.`
            : "Saved",
      });
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Customer and delivery"
      actions={
        canEdit &&
        !draft && (
          <EditButton
            label="Edit customer and address"
            onClick={() =>
              setDraft({
                name: order.name,
                phone: order.phone,
                address: order.address,
                district: order.district,
                thana: order.thana ?? "",
              })
            }
          />
        )
      }
    >
      {draft ? (
        <>
          <AddressFields value={draft} onChange={setDraft} errors={errors} />
          <p className="text-caption text-ink-500">Moving the order inside or outside Dhaka updates the delivery fee.</p>
          <SaveBar busy={busy} onSave={save} onCancel={() => setDraft(null)} />
        </>
      ) : (
        <dl className="grid gap-3 text-base md:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-500">Name</dt>
            <dd className="font-semibold text-ink-950">{order.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-500">Phone</dt>
            <dd>
              <a href={telHref(order.phone)} className="inline-flex min-h-11 items-center gap-2 font-semibold tabular-nums text-brand-600">
                <Phone size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
                {order.phone}
              </a>
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-sm text-ink-500">Address</dt>
            <dd className="text-ink-900">{order.address}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-500">District</dt>
            <dd className="text-ink-900">{order.district}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-500">Thana</dt>
            <dd className="text-ink-900">{order.thana ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-500">Payment</dt>
            <dd className="text-ink-900">
              {order.paymentMethod} · {order.paymentStatus.toLowerCase()}
            </dd>
          </div>
        </dl>
      )}
      <FormStatus status={status} />
    </Panel>
  );
}

// ───────────── Notes ─────────────

export function OrderNotesPanel({ order, canEdit }: { order: AdminOrderDetail; canEdit: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const add = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setStatus(null);
    try {
      await adminApi.addOrderNote(order.id, text);
      setBody("");
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Notes" id="notes">
      {order.note && (
        <figure className="flex flex-col gap-1 rounded-btn bg-brand-50 p-3.5">
          <figcaption className="text-xs font-semibold uppercase tracking-tag text-brand-800">Customer note</figcaption>
          <blockquote className="text-copy text-ink-900">{order.note}</blockquote>
        </figure>
      )}
      {canEdit && (
        <div className="flex flex-col gap-2">
          <label htmlFor="order-note" className="sr-only">
            Add a note
          </label>
          <TextArea
            id="order-note"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            placeholder="e.g. Call after 6 pm, wants the warm white one"
            className="min-h-20"
          />
          <Button onClick={add} disabled={busy || !body.trim()} className="md:self-end">
            {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
            Add note
          </Button>
          <FormStatus status={status} />
        </div>
      )}
      {order.notes.length === 0 ? (
        !order.note && <p className="text-sm text-ink-500">No notes yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {order.notes.map((n) => (
            <li key={n.id} className="flex gap-3 py-3 first:pt-0">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-700">
                {n.kind === "NO_ANSWER" ? (
                  <PhoneMissed size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                ) : (
                  <MessageSquareText size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                )}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-copy text-ink-900">
                  {n.kind === "NO_ANSWER" ? <span className="font-semibold">Called, no answer</span> : n.body}
                </p>
                <p className="text-caption text-ink-500">
                  {n.adminName ?? "Admin"} · <span suppressHydrationWarning>{formatDateTime(n.createdAt)}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
