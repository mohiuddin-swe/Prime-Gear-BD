import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ORDER_EDIT_ROLES,
  ORDER_STATUSES,
  type AdminIncompleteOrder,
  type AdminOrderCounts,
  type AdminOrderRow,
  type AdminShippingFees,
} from "@primegear/shared/orders";
import { IncompleteBoard } from "@/components/admin/orders/incomplete-board";
import { OrderBoard } from "@/components/admin/orders/order-board";
import {
  OrderFilters,
  StatusTabs,
  ordersHref,
  type OrderListState,
  type OrderTab,
} from "@/components/admin/orders/order-filters";
import { EmptyState, PageTitle, Pagination } from "@/components/admin/ui";
import { ADMIN_LOGIN_PATH, adminGet, getAdminSession, toQuery } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Orders" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [params, admin] = await Promise.all([searchParams, getAdminSession()]);
  if (!admin) redirect(ADMIN_LOGIN_PATH);
  const callCenter = (ORDER_EDIT_ROLES as readonly string[]).includes(admin.role);

  // Packers start where their work is: confirmed orders waiting to be packed
  const requested = one(params.tab).toUpperCase();
  const tab: OrderTab =
    requested === "INCOMPLETE" && callCenter
      ? "INCOMPLETE"
      : (ORDER_STATUSES as readonly string[]).includes(requested)
        ? (requested as OrderTab)
        : callCenter
          ? "PENDING"
          : "CONFIRMED";
  const from = isDate(one(params.from)) ? one(params.from) : "";
  const to = isDate(one(params.to)) ? one(params.to) : "";
  const state: OrderListState = { tab, q: one(params.q).trim(), from, to };
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);

  const filter = toQuery({ q: state.q, from, to }, ["q", "from", "to"]);
  const listQuery = toQuery(
    { q: state.q, from, to, page: String(page), limit: "20", status: tab === "INCOMPLETE" ? undefined : tab },
    ["q", "from", "to", "page", "limit", "status"],
  );

  const [{ data: counts }, list, fees] = await Promise.all([
    adminGet<AdminOrderCounts>(`/admin/orders/counts${filter}`),
    tab === "INCOMPLETE"
      ? adminGet<AdminIncompleteOrder[]>(`/admin/incomplete-orders${listQuery}`)
      : adminGet<AdminOrderRow[]>(`/admin/orders${listQuery}`),
    tab === "INCOMPLETE" ? adminGet<AdminShippingFees>("/admin/orders/shipping-fees") : null,
  ]);
  const filtered = Boolean(state.q || from || to);

  return (
    <>
      <PageTitle
        title="Orders"
        description={
          counts.PENDING > 0
            ? `${counts.PENDING} waiting for confirmation${filtered ? " (filtered)" : ""}`
            : "Nothing waiting for confirmation"
        }
      />
      <OrderFilters state={state} />
      <StatusTabs state={state} counts={counts} showIncomplete={callCenter} />

      {list.data.length === 0 ? (
        <EmptyState
          title={
            filtered
              ? "No orders match"
              : tab === "INCOMPLETE"
                ? "No incomplete checkouts"
                : "No orders here yet"
          }
        >
          {filtered ? "Try another search or date range." : undefined}
        </EmptyState>
      ) : tab === "INCOMPLETE" ? (
        <IncompleteBoard checkouts={list.data as AdminIncompleteOrder[]} fees={fees!.data} />
      ) : (
        <OrderBoard orders={list.data as AdminOrderRow[]} role={admin.role} />
      )}

      {list.meta && (
        <Pagination
          page={list.meta.page}
          limit={list.meta.limit}
          total={list.meta.total}
          href={(p) => ordersHref(state, { page: p })}
        />
      )}
    </>
  );
}
