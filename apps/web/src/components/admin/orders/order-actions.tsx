"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Check, LoaderCircle, Phone, PhoneMissed, TriangleAlert, X } from "lucide-react";
import type { AdminRole } from "@primegear/shared";
import {
  CANCEL_REASONS,
  LATE_CONFIRM_DAYS,
  ORDER_STATUS_LABEL,
  isLateConfirmation,
  nextStatuses,
  type OrderStatus,
  type OrderStatusResult,
} from "@primegear/shared/orders";
import { Button } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";
import { adminApi, errorMessage } from "@/lib/admin-api";
import { daysSince, telHref } from "@/lib/admin-format";
import { TextArea } from "../ui";

export type ActionOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  phone: string;
  createdAt: string;
};

const MOVE_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Confirm",
  PACKED: "Mark packed",
  SHIPPED: "Mark shipped",
  DELIVERED: "Delivered",
  PARTIAL_DELIVERED: "Partly delivered",
  RETURNED: "Returned",
  PENDING: "Reopen",
};

const CALL_ROLES: readonly AdminRole[] = ["OWNER", "MANAGER", "CALL_AGENT"];

// 56 px one-handed targets: thumb-sized, full width of their grid cell
const big = "h-14 w-full rounded-btn text-base font-bold md:h-12";
const outline = "border border-line-strong bg-white text-ink-900 active:bg-brand-50";

export const lateWarning = (days: number) =>
  `Placed ${days} days ago. Ad platforms only accept a Purchase up to ${LATE_CONFIRM_DAYS} days after the order, so this sale may not be credited to the ad.`;

/**
 * Call / No answer / Cancel / Confirm for a pending order, the next moves for later statuses.
 * Confirm is one tap, except an order older than LATE_CONFIRM_DAYS, which asks first.
 * Cancel opens a sheet with one-tap reasons.
 */
export function OrderActions({
  order,
  role,
  onDone,
  announceInline = true,
}: {
  order: ActionOrder;
  role: AdminRole;
  /** After a successful change (the page is refreshed too) */
  onDone?: (result: { status?: OrderStatus; noAnswerCount?: number; message: string }) => void;
  /** Show successes under the buttons (off when the parent shows a toast; errors always show) */
  announceInline?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [lateOpen, setLateOpen] = useState(false);

  const moves = nextStatuses(order.status, role);
  const canCall = CALL_ROLES.includes(role);
  const late = isLateConfirmation(order.createdAt);
  const forward = moves.filter((s) => s !== "CANCELLED");
  const canCancel = moves.includes("CANCELLED");

  const run = async (key: string, fn: () => Promise<{ status?: OrderStatus; noAnswerCount?: number; message: string }>) => {
    setBusy(key);
    setMessage(null);
    try {
      const result = await fn();
      setMessage({ kind: "ok", text: result.message });
      onDone?.(result);
      router.refresh();
      return true;
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const move = (to: OrderStatus, note?: string) =>
    run(to, async () => {
      const r: OrderStatusResult = await adminApi.setOrderStatus(order.id, to, note);
      const text =
        to === "CONFIRMED" && r.lateConfirmation
          ? `Confirmed ${r.orderNumber}. Placed more than ${LATE_CONFIRM_DAYS} days ago, so the ad may not get credit.`
          : `${ORDER_STATUS_LABEL[r.status]}: ${r.orderNumber}`;
      return { status: r.status, message: text };
    });

  const confirm = () => (late ? setLateOpen(true) : void move("CONFIRMED"));

  const noAnswer = () =>
    run("no-answer", async () => {
      const r = await adminApi.noAnswer(order.id);
      return { noAnswerCount: r.noAnswerCount, message: `No answer logged (${r.noAnswerCount}×)` };
    });

  const spinner = (key: string, icon: ReactNode) =>
    busy === key ? <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" /> : icon;

  const pending = order.status === "PENDING";
  const extraMoves = forward.filter((s) => !(pending && s === "CONFIRMED"));

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {canCall && (
          <a href={telHref(order.phone)} className={cn(big, outline, "inline-flex items-center justify-center gap-2")}>
            <Phone size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Call
          </a>
        )}
        {canCall && (pending || order.status === "CONFIRMED") && (
          <button
            type="button"
            onClick={noAnswer}
            disabled={busy !== null}
            className={cn(big, outline, "inline-flex items-center justify-center gap-2 disabled:opacity-50")}
          >
            {spinner("no-answer", <PhoneMissed size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />)}
            No answer
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            disabled={busy !== null}
            className={cn(
              big,
              "inline-flex items-center justify-center gap-2 border border-danger/40 bg-white text-danger-ink active:bg-danger/10 disabled:opacity-50",
            )}
          >
            {spinner("CANCELLED", <X size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />)}
            Cancel
          </button>
        )}
        {pending && moves.includes("CONFIRMED") && (
          <Button onClick={confirm} disabled={busy !== null} className={big}>
            {spinner("CONFIRMED", <Check size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />)}
            Confirm
          </Button>
        )}
        {extraMoves.map((to) => (
            <Button
              key={to}
              onClick={() => void move(to)}
              disabled={busy !== null}
              variant={to === "PENDING" || to === "RETURNED" ? "outline" : "primary"}
              className={big}
            >
              {spinner(to, null)}
              {MOVE_LABEL[to] ?? ORDER_STATUS_LABEL[to]}
            </Button>
        ))}
      </div>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          "text-sm font-semibold",
          message?.kind === "error" ? "text-danger-ink" : "text-success-ink",
          (!message || (message.kind === "ok" && !announceInline)) && "sr-only",
        )}
      >
        {message && (message.kind === "error" || announceInline) ? message.text : ""}
      </p>

      <CancelSheet
        open={cancelOpen}
        orderNumber={order.orderNumber}
        onClose={() => setCancelOpen(false)}
        onCancel={async (reason) => {
          if (await move("CANCELLED", reason)) setCancelOpen(false);
        }}
        busy={busy === "CANCELLED"}
      />

      <BottomSheet
        open={lateOpen}
        onClose={() => setLateOpen(false)}
        title={`Confirm ${order.orderNumber}?`}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setLateOpen(false)}>
              Not now
            </Button>
            <Button
              disabled={busy !== null}
              onClick={async () => {
                if (await move("CONFIRMED")) setLateOpen(false);
              }}
            >
              {spinner("CONFIRMED", null)}
              Confirm anyway
            </Button>
          </div>
        }
      >
        <LateNotice days={daysSince(order.createdAt)} />
      </BottomSheet>
    </div>
  );
}

export function LateNotice({ days, children }: { days: number; children?: ReactNode }) {
  return (
    <div role="note" className="flex gap-3 rounded-btn bg-brand-50 p-3.5 text-sm text-brand-800">
      <TriangleAlert size={20} strokeWidth={ICON_STROKE} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{children ?? lateWarning(days)}</p>
    </div>
  );
}

/** One tap on a reason cancels; "Other" takes a typed reason. */
function CancelSheet({
  open,
  orderNumber,
  onClose,
  onCancel,
  busy,
}: {
  open: boolean;
  orderNumber: string;
  onClose: () => void;
  onCancel: (reason: string) => Promise<void>;
  busy: boolean;
}) {
  const [other, setOther] = useState("");
  return (
    <BottomSheet open={open} onClose={onClose} title={`Cancel ${orderNumber}?`}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-500">Pick the reason. Stock goes back on sale.</p>
        <ul className="grid gap-2">
          {CANCEL_REASONS.map((reason) => (
            <li key={reason}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onCancel(reason)}
                className="flex min-h-13 w-full items-center rounded-btn border border-line-strong bg-white px-4 text-left text-base font-semibold text-ink-900 active:bg-danger/10 disabled:opacity-50"
              >
                {reason}
              </button>
            </li>
          ))}
        </ul>
        <label htmlFor={`cancel-other-${orderNumber}`} className="text-sm font-semibold text-ink-700">
          Other reason
        </label>
        <TextArea
          id={`cancel-other-${orderNumber}`}
          value={other}
          onChange={(e) => setOther(e.target.value)}
          maxLength={500}
          className="min-h-20"
        />
        <Button
          disabled={busy || other.trim().length === 0}
          onClick={() => void onCancel(other.trim())}
          className="bg-none bg-danger shadow-none"
        >
          {busy && <LoaderCircle size={20} className="motion-safe:animate-spin" aria-hidden="true" />}
          Cancel order
        </Button>
      </div>
    </BottomSheet>
  );
}
