import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";
import { ORDER_STATUS_LABEL, dhakaDate, shiftDate, type AdminOrderCounts, type OrderStatus } from "@primegear/shared/orders";
import { buttonClasses } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { controlCls } from "../ui";

export type OrderTab = OrderStatus | "INCOMPLETE";
export type OrderListState = { tab: OrderTab; q: string; from: string; to: string };

const TAB_ORDER: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

/** /admin/orders/?tab=..&q=..&from=..&to=..&page=.. with blanks dropped */
export function ordersHref(state: OrderListState, patch: Partial<OrderListState> & { page?: number } = {}) {
  const next = { ...state, ...patch };
  const sp = new URLSearchParams();
  sp.set("tab", next.tab.toLowerCase());
  if (next.q) sp.set("q", next.q);
  if (next.from) sp.set("from", next.from);
  if (next.to) sp.set("to", next.to);
  if (patch.page && patch.page > 1) sp.set("page", String(patch.page));
  return `/admin/orders/?${sp.toString()}`;
}

const chip =
  "relative flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap";
const chipOn = "border-brand-600 bg-brand-50 font-semibold text-brand-800";
const chipOff = "border-line-strong bg-white font-medium text-ink-700 active:bg-brand-50";

export function StatusTabs({
  state,
  counts,
  showIncomplete,
}: {
  state: OrderListState;
  counts: AdminOrderCounts;
  showIncomplete: boolean;
}) {
  const tabs: { tab: OrderTab; label: string; count: number }[] = TAB_ORDER.map((s) => ({
    tab: s,
    label: ORDER_STATUS_LABEL[s],
    count: counts[s],
  }));
  // Rare: only shown once there is one
  if (counts.PARTIAL_DELIVERED > 0) {
    tabs.splice(5, 0, { tab: "PARTIAL_DELIVERED", label: ORDER_STATUS_LABEL.PARTIAL_DELIVERED, count: counts.PARTIAL_DELIVERED });
  }
  if (showIncomplete) tabs.push({ tab: "INCOMPLETE", label: "Incomplete", count: counts.incomplete });

  return (
    <nav aria-label="Order status" className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      <ul className="flex gap-2">
        {tabs.map((t) => {
          const on = t.tab === state.tab;
          return (
            <li key={t.tab}>
              <Link
                href={ordersHref(state, { tab: t.tab })}
                aria-current={on ? "page" : undefined}
                className={cn(chip, on ? chipOn : chipOff)}
              >
                {t.label}
                <span
                  className={cn(
                    "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs font-bold tabular-nums",
                    on ? "bg-brand-600 text-white" : "bg-surface-sunken text-ink-700",
                  )}
                >
                  {t.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Search (phone / order number / name) and date range. Plain GET forms: no JS needed. */
export function OrderFilters({ state }: { state: OrderListState }) {
  const today = dhakaDate();
  const presets = [
    { label: "All time", from: "", to: "" },
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: shiftDate(today, -1), to: shiftDate(today, -1) },
    { label: "Last 7 days", from: shiftDate(today, -6), to: today },
    { label: "Last 30 days", from: shiftDate(today, -29), to: today },
  ];
  const activePreset = presets.find((p) => p.from === state.from && p.to === state.to);
  const custom = !activePreset;

  return (
    <div className="flex flex-col gap-3">
      <form role="search" action="/admin/orders/" className="xl:w-96">
        <input type="hidden" name="tab" value={state.tab.toLowerCase()} />
        {state.from && <input type="hidden" name="from" value={state.from} />}
        {state.to && <input type="hidden" name="to" value={state.to} />}
        <label className="flex h-12 items-center gap-2.5 rounded-btn border border-line-strong bg-white px-3.5 text-ink-500 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
          <Search size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={state.q}
            placeholder="Phone, order number or name"
            aria-label="Search orders by phone, order number or name"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
          />
        </label>
      </form>

      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-2" aria-label="Date">
          {presets.map((p) => {
            const on = p === activePreset;
            return (
              <li key={p.label}>
                <Link
                  href={ordersHref(state, { from: p.from, to: p.to })}
                  aria-current={on ? "true" : undefined}
                  className={cn(chip, "h-10 px-3.5 after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']", on ? chipOn : chipOff)}
                >
                  {p.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <details open={custom} className="group rounded-card bg-white shadow-card-soft">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-ink-700 [&::-webkit-details-marker]:hidden">
          <CalendarDays size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {custom ? `Custom: ${state.from || "…"} to ${state.to || "…"}` : "Custom dates"}
        </summary>
        <form action="/admin/orders/" className="grid grid-cols-2 gap-3 px-4 pb-4 md:flex md:items-end">
          <input type="hidden" name="tab" value={state.tab.toLowerCase()} />
          {state.q && <input type="hidden" name="q" value={state.q} />}
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-700">
            From
            <input type="date" name="from" defaultValue={state.from} max={today} className={cn(controlCls, "h-12 px-3")} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-700">
            To
            <input type="date" name="to" defaultValue={state.to} max={today} className={cn(controlCls, "h-12 px-3")} />
          </label>
          <button type="submit" className={buttonClasses({}, "col-span-2 md:w-auto")}>
            Apply
          </button>
        </form>
      </details>
    </div>
  );
}
