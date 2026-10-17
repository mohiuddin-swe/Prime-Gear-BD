"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronRight, LoaderCircle, MapPin, PhoneMissed } from "lucide-react";
import type { AdminRole } from "@primegear/shared";
import { formatTaka } from "@primegear/shared/format";
import {
  LATE_CONFIRM_DAYS,
  canTransition,
  isLateConfirmation,
  type AdminOrderRow,
  type CustomerHistorySummary,
} from "@primegear/shared/orders";
import { Button } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { daysSince, formatDateTime, formatTime, orderHref, timeAgo } from "@/lib/admin-format";
import { LateNotice, OrderActions } from "./order-actions";
import { OrderStatusBadge } from "./order-status-badge";

/** "New customer" or the phone's track record; returns and cancellations stand out. */
export function HistoryChip({ history }: { history: CustomerHistorySummary }) {
  if (history.previous === 0) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-xs font-semibold text-brand-800">
        New customer
      </span>
    );
  }
  const risky = history.returned + history.cancelled > 0;
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-tight",
        risky ? "bg-danger/10 text-danger-ink" : "bg-success/10 text-success-ink",
      )}
    >
      {history.previous} {history.previous === 1 ? "order" : "orders"} · {history.delivered} delivered
      {history.returned > 0 && ` · ${history.returned} returned`}
      {history.cancelled > 0 && ` · ${history.cancelled} cancelled`}
    </span>
  );
}

export function NoAnswerChip({ count, at }: { count: number; at: string | null }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-sunken px-2.5 text-xs font-semibold text-ink-700">
      <PhoneMissed size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
      No answer ×{count}
      {at && <span suppressHydrationWarning className="font-normal">· {formatTime(at)}</span>}
    </span>
  );
}

/**
 * Result toast: under the header on phones (clear of the thumb zone where the action buttons are),
 * bottom-centre from md. Never takes taps.
 */
function useToast() {
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error"; key: number } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const node = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-16 z-40 flex justify-center md:bottom-6 md:left-64 md:top-auto"
    >
      {toast && (
        <p
          key={toast.key}
          className={cn(
            "max-w-md rounded-btn px-4 py-3 text-sm font-semibold text-white shadow-card-lift motion-safe:animate-fade-in",
            toast.kind === "error" ? "bg-danger" : "bg-ink-950",
          )}
        >
          {toast.text}
        </p>
      )}
    </div>
  );
  return { node, show: (text: string, kind: "ok" | "error" = "ok") => setToast({ text, kind, key: Date.now() }) };
}

export function OrderBoard({ orders, role }: { orders: AdminOrderRow[]; role: AdminRole }) {
  const toast = useToast();
  return (
    <>
      {/* Phones and tablets: one-handed cards */}
      <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <OrderCard order={o} role={role} onDone={(text) => toast.show(text)} />
          </li>
        ))}
      </ul>
      <div className="hidden xl:block">
        <OrderTable orders={orders} role={role} onToast={toast.show} />
      </div>
      {toast.node}
    </>
  );
}

function OrderCard({ order: o, role, onDone }: { order: AdminOrderRow; role: AdminRole; onDone: (text: string) => void }) {
  const late = o.status === "PENDING" && isLateConfirmation(o.createdAt);
  return (
    <article className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card">
      <Link href={orderHref(o.id)} className="-m-1 flex flex-col gap-2 rounded-btn p-1 active:bg-brand-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate font-heading text-lead font-bold text-ink-950">{o.name}</h3>
            <p className="text-copy font-semibold tabular-nums text-ink-900">{o.phone}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="font-heading text-lead font-extrabold tabular-nums text-ink-950">{formatTaka(o.total)}</span>
            <OrderStatusBadge status={o.status} />
          </div>
        </div>
        <p className="line-clamp-2 text-copy text-ink-700">
          {o.itemsSummary}
        </p>
        <p className="flex items-center gap-1.5 text-caption text-ink-500">
          <MapPin size={16} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{[o.thana, o.district].filter(Boolean).join(", ")}</span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <HistoryChip history={o.history} />
          <NoAnswerChip count={o.noAnswerCount} at={o.lastContactAt} />
          {late && (
            <span className="inline-flex h-6 items-center rounded-full bg-danger/10 px-2.5 text-xs font-semibold text-danger-ink">
              {daysSince(o.createdAt)} days old
            </span>
          )}
        </div>
        <p className="flex items-center justify-between text-caption text-ink-500">
          <span className="tabular-nums">
            {o.orderNumber} · <span suppressHydrationWarning>{timeAgo(o.createdAt)}</span>
          </span>
          <span className="inline-flex items-center font-semibold text-brand-600">
            Details
            <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </span>
        </p>
      </Link>
      <OrderActions order={o} role={role} onDone={(r) => onDone(r.message)} announceInline={false} />
    </article>
  );
}

function OrderTable({
  orders,
  role,
  onToast,
}: {
  orders: AdminOrderRow[];
  role: AdminRole;
  onToast: (text: string, kind?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const selectable = orders.filter((o) => canTransition(o.status, "CONFIRMED", role));
  const [picked, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Only rows still on the page and still confirmable count (the list refreshes after actions)
  const selected = new Set(selectable.filter((o) => picked.has(o.id)).map((o) => o.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOn = selectable.length > 0 && selectable.every((o) => selected.has(o.id));
  const chosen = orders.filter((o) => selected.has(o.id));
  const lateCount = chosen.filter((o) => isLateConfirmation(o.createdAt)).length;

  const bulkConfirm = async () => {
    setBusy(true);
    try {
      const r = await adminApi.bulkOrderStatus([...selected], "CONFIRMED");
      const failed = r.failed.map((f) => `${f.orderNumber ?? f.id}: ${f.message}`).join("; ");
      onToast(
        `Confirmed ${r.updated.length} ${r.updated.length === 1 ? "order" : "orders"}.${failed ? ` Not confirmed: ${failed}` : ""}`,
        r.failed.length && !r.updated.length ? "error" : "ok",
      );
      setSelected(new Set());
      setSheetOpen(false);
      router.refresh();
    } catch (err) {
      onToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {selectable.length > 0 && (
        <div
          className={cn(
            "sticky top-4 z-10 flex min-h-14 items-center justify-between gap-3 rounded-card px-4 py-2 transition",
            selected.size > 0 ? "bg-ink-950 text-white shadow-card-lift" : "bg-white text-ink-700 shadow-card",
          )}
        >
          <span className="text-sm font-semibold">
            {selected.size > 0
              ? `${selected.size} selected`
              : `Select pending orders to confirm them together`}
          </span>
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Button variant="outline-dark" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button onClick={() => setSheetOpen(true)}>
                <Check size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Confirm {selected.size}
              </Button>
            </div>
          )}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              {selectable.length > 0 && (
                <input
                  type="checkbox"
                  aria-label="Select all pending orders on this page"
                  checked={allOn}
                  onChange={() => setSelected(allOn ? new Set() : new Set(selectable.map((o) => o.id)))}
                  className="size-5 accent-brand-600"
                />
              )}
            </TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="w-[28%]">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => {
            const canSelect = selectable.includes(o);
            const late = o.status === "PENDING" && isLateConfirmation(o.createdAt);
            return (
              <TableRow
                key={o.id}
                data-state={selected.has(o.id) ? "selected" : undefined}
                className="relative focus-within:bg-brand-50"
              >
                <TableCell>
                  {canSelect && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${o.orderNumber}`}
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      className="relative z-10 size-5 accent-brand-600"
                    />
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Link
                    href={orderHref(o.id)}
                    className="font-semibold tabular-nums text-brand-600 after:absolute after:inset-0 after:content-['']"
                  >
                    {o.orderNumber}
                  </Link>
                  <span suppressHydrationWarning className="block text-xs text-ink-500">
                    {formatDateTime(o.createdAt)}
                  </span>
                  {late && <span className="block text-xs font-semibold text-danger-ink">{daysSince(o.createdAt)} days old</span>}
                </TableCell>
                <TableCell>
                  <span className="block font-semibold text-ink-950">{o.name}</span>
                  <span className="block tabular-nums text-ink-700">{o.phone}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <HistoryChip history={o.history} />
                    <NoAnswerChip count={o.noAnswerCount} at={o.lastContactAt} />
                  </span>
                </TableCell>
                <TableCell className="text-ink-700">
                  <span className="line-clamp-2">{o.itemsSummary}</span>
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-ink-950">{formatTaka(o.total)}</TableCell>
                <TableCell className="text-ink-700">{[o.thana, o.district].filter(Boolean).join(", ")}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={o.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`Confirm ${selected.size} ${selected.size === 1 ? "order" : "orders"}?`}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={busy}>
              Back
            </Button>
            <Button onClick={bulkConfirm} disabled={busy}>
              {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
              Confirm {selected.size}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-base text-ink-700">
            Each order is confirmed on its own; any that changed meanwhile are skipped and listed.
          </p>
          {lateCount > 0 && (
            <LateNotice days={0}>
              {lateCount} of these {lateCount === 1 ? "was" : "were"} placed more than {LATE_CONFIRM_DAYS} days ago. Ad platforms
              may not credit those sales to the ad.
            </LateNotice>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
