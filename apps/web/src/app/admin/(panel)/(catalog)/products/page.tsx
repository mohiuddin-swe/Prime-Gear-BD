import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, Plus, Search } from "lucide-react";
import { PRODUCT_STATUSES, type AdminProductRow } from "@primegear/shared";
import { formatTaka } from "@primegear/shared/format";
import { buttonClasses } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { EmptyState, PageTitle, Pagination, StatusBadge } from "@/components/admin/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGet, toQuery } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Products" };

type Search = Record<string, string | string[] | undefined>;

const STATUS_TABS = [{ value: "", label: "All" }, ...PRODUCT_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0) + s.slice(1).toLowerCase(),
}))];

const editHref = (id: string) => `/admin/products/${id}/`;

function Thumb({ url, size }: { url: string | null; size: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-sunken text-ink-400"
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={url} alt="" fill sizes={`${size}px`} className="object-contain" />
      ) : (
        <ImageOff size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
      )}
    </span>
  );
}

const stockText = (p: AdminProductRow) => (p.stock > 0 ? `${p.stock} in stock` : "Out of stock");

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { data: products, meta } = await adminGet<AdminProductRow[]>(
    `/admin/products${toQuery({ limit: "20", ...params }, ["q", "status", "page", "limit"])}`,
  );
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "";
  const listHref = (next: { status?: string; page?: number }) =>
    `/admin/products/${toQuery(
      { q, status: next.status ?? status, page: next.page && next.page > 1 ? String(next.page) : undefined },
      ["q", "status", "page"],
    )}`;

  return (
    <>
      <PageTitle
        title="Products"
        description={`${meta?.total ?? products.length} products`}
        actions={
          <Link href="/admin/products/new/" className={buttonClasses({}, "w-full md:w-auto")}>
            <Plus size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            New product
          </Link>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form role="search" className="md:w-80">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="flex h-12 items-center gap-2.5 rounded-btn border border-line-strong bg-white px-3.5 text-ink-500 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
            <Search size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name, slug or SKU"
              aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
            />
          </label>
        </form>
        <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex gap-2">
            {STATUS_TABS.map((tab) => {
              const on = tab.value === status;
              return (
                <li key={tab.value}>
                  <Link
                    href={listHref({ status: tab.value, page: 1 })}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex h-9.5 items-center rounded-full border px-3.5 text-sm after:absolute after:inset-x-0 after:-inset-y-0.75 after:content-['']",
                      on
                        ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
                        : "border-line-strong bg-white font-medium text-ink-700",
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {products.length === 0 ? (
        <EmptyState title={q || status ? "No products match" : "No products yet"}>
          {q || status ? "Try another search or status." : "Create your first product to start selling."}
        </EmptyState>
      ) : (
        <>
          {/* Phones and tablets: cards */}
          <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={editHref(p.id)}
                  className="flex min-h-24 items-center gap-3 rounded-card bg-white p-3 shadow-card motion-safe:active:-translate-y-px"
                >
                  <Thumb url={p.imageUrl} size={72} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="line-clamp-2 text-copy font-semibold leading-card text-ink-950">
                      {p.name}
                    </span>
                    <span className="truncate text-caption text-ink-500">
                      {[p.category, `${p.variantCount} ${p.variantCount === 1 ? "variant" : "variants"}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-heading text-base font-extrabold tabular-nums text-ink-950">
                        {formatTaka(p.price)}
                      </span>
                      <StatusBadge status={p.status} />
                      <span className={cn("text-caption", p.stock > 0 ? "text-ink-500" : "font-semibold text-danger")}>
                        {stockText(p)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* xl: data table */}
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} className="relative focus-within:bg-brand-50">
                    <TableCell>
                      <Link href={editHref(p.id)} className="flex items-center gap-3 font-semibold text-ink-950 after:absolute after:inset-0 after:content-['']">
                        <Thumb url={p.imageUrl} size={48} />
                        <span className="flex min-w-0 flex-col">
                          <span className="line-clamp-1">{p.name}</span>
                          <span className="text-xs font-normal text-ink-500">
                            {p.variantCount} {p.variantCount === 1 ? "variant" : "variants"}
                            {p.brand ? ` · ${p.brand}` : ""}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{formatTaka(p.price)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", p.stock === 0 && "font-semibold text-danger")}>
                      {p.stock}
                    </TableCell>
                    <TableCell className="text-ink-700">{p.category ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-ink-500">
                      {new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {meta && (
            <Pagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              href={(page) => listHref({ page })}
            />
          )}
        </>
      )}
    </>
  );
}
