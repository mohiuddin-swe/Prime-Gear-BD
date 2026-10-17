import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatTaka } from "@primegear/shared/format";
import {
  LATE_CONFIRM_DAYS,
  ORDER_EDIT_ROLES,
  ORDER_STATUS_LABEL,
  isLateConfirmation,
  isOrderEditable,
  type AdminOrderDetail,
} from "@primegear/shared/orders";
import { cn } from "@primegear/ui/cn";
import { LateNotice, OrderActions } from "@/components/admin/orders/order-actions";
import { HistoryChip, NoAnswerChip } from "@/components/admin/orders/order-board";
import {
  OrderAddressPanel,
  OrderItemsPanel,
  OrderNotesPanel,
} from "@/components/admin/orders/order-detail-panels";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { PageTitle, Panel } from "@/components/admin/ui";
import { ADMIN_LOGIN_PATH, adminGet, getAdminSession } from "@/lib/admin-server";
import { daysSince, formatDate, formatDateTime, orderHref } from "@/lib/admin-format";
import { isNotFound } from "@/lib/api";

export const metadata: Metadata = { title: "Order" };

const SOURCE_LABEL: Record<string, string> = {
  WEBSITE: "Website",
  ADMIN: "Admin",
  PHONE: "Phone",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  OTHER: "Other",
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, admin] = await Promise.all([params, getAdminSession()]);
  if (!admin) redirect(ADMIN_LOGIN_PATH);
  let order: AdminOrderDetail;
  try {
    order = (await adminGet<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`)).data;
  } catch (err) {
    if (isNotFound(err)) notFound();
    throw err;
  }

  const callCenter = (ORDER_EDIT_ROLES as readonly string[]).includes(admin.role);
  const canEdit = callCenter && isOrderEditable(order.status);
  const latePending = order.status === "PENDING" && isLateConfirmation(order.createdAt);
  const confirmedLate = order.confirmedAt && isLateConfirmation(order.createdAt, new Date(order.confirmedAt));

  return (
    <>
      <PageTitle
        title={order.orderNumber}
        back={{ href: "/admin/orders/", label: "Orders" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span suppressHydrationWarning>Placed {formatDateTime(order.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{SOURCE_LABEL[order.source] ?? order.source}</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold tabular-nums text-ink-950">{formatTaka(order.total)}</span>
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-6">
        <div className="flex flex-col gap-5 md:gap-6">
          {(latePending || confirmedLate) && (
            <LateNotice days={daysSince(order.createdAt)}>
              {latePending
                ? `Placed ${daysSince(order.createdAt)} days ago. Ad platforms only accept a Purchase up to ${LATE_CONFIRM_DAYS} days after the order, so confirming now may not credit the sale to the ad.`
                : `Confirmed more than ${LATE_CONFIRM_DAYS} days after it was placed: the Purchase may not be credited to the ad.`}
            </LateNotice>
          )}

          <Panel>
            <div className="flex flex-wrap items-center gap-1.5">
              <HistoryChip history={order.history} />
              <NoAnswerChip count={order.noAnswerCount} at={order.lastContactAt} />
            </div>
            <OrderActions order={order} role={admin.role} />
          </Panel>

          <OrderItemsPanel order={order} canEdit={canEdit} />
          <OrderAddressPanel order={order} canEdit={canEdit} />
          <OrderNotesPanel order={order} canEdit={callCenter} />
        </div>

        <div className="flex flex-col gap-5 md:gap-6">
          <Panel title="Customer history" description={`Other orders from ${order.phone}`}>
            <dl className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Orders", order.history.previous, "text-ink-950"],
                ["Delivered", order.history.delivered, "text-success-ink"],
                ["Returned", order.history.returned, "text-danger-ink"],
                ["Cancelled", order.history.cancelled, "text-danger-ink"],
              ].map(([label, value, tone]) => (
                <div key={label as string} className="flex flex-col-reverse gap-0.5 rounded-btn bg-surface px-1 py-2.5">
                  <dt className="text-2xs font-semibold uppercase tracking-tag text-ink-500">{label}</dt>
                  <dd className={cn("font-heading text-xl font-extrabold tabular-nums", value === 0 ? "text-ink-500" : (tone as string))}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {order.customerOrders.length === 0 ? (
              <p className="text-sm text-ink-500">First order from this number.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {order.customerOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={orderHref(o.id)} className="flex min-h-13 items-center justify-between gap-3 py-2 active:bg-brand-50">
                      <span className="flex flex-col">
                        <span className="font-semibold tabular-nums text-brand-600">{o.orderNumber}</span>
                        <span suppressHydrationWarning className="text-caption text-ink-500">
                          {formatDate(o.createdAt)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-bold tabular-nums text-ink-950">{formatTaka(o.total)}</span>
                        <OrderStatusBadge status={o.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Status timeline">
            <ol className="flex flex-col">
              {order.timeline.map((t, i) => (
                <li key={t.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < order.timeline.length - 1 && (
                    <span aria-hidden="true" className="absolute left-[7px] top-5 h-full w-0.5 bg-line" />
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative mt-1 size-4 shrink-0 rounded-full border-2 border-white shadow-card",
                      i === order.timeline.length - 1 ? "bg-brand-600" : "bg-line-stronger",
                    )}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-copy font-semibold text-ink-950">
                      {ORDER_STATUS_LABEL[t.toStatus]}
                      {t.fromStatus && (
                        <span className="font-normal text-ink-500"> from {ORDER_STATUS_LABEL[t.fromStatus]}</span>
                      )}
                    </p>
                    {t.note && <p className="text-sm text-ink-700">{t.note}</p>}
                    <p className="text-caption text-ink-500">
                      {t.adminName ?? (t.fromStatus === null ? "Customer" : "System")} ·{" "}
                      <span suppressHydrationWarning>{formatDateTime(t.createdAt)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {order.confirmedAt && (
              <p className="border-t border-line pt-3 text-caption text-ink-500">
                {order.purchaseSentAt ? (
                  <>
                    Purchase sent to ad platforms <span suppressHydrationWarning>{formatDateTime(order.purchaseSentAt)}</span>
                  </>
                ) : (
                  "Purchase not sent to ad platforms yet"
                )}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
