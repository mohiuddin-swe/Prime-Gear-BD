"use client";

import { useRef, useState } from "react";
import { ArrowDownUp, Check, SlidersHorizontal } from "lucide-react";
import type { ProductCard, ProductSort } from "@primegear/shared";
import { formatTaka } from "@primegear/shared/format";
import { Button } from "@primegear/ui/button";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";
import { ProductCardSkeleton } from "@primegear/ui/skeleton";
import { ProductGrid } from "@/components/product/product-grid";
import { fetchCategoryProducts } from "@/app/product-category/[slug]/actions";

type Filters = { minPrice?: number; maxPrice?: number; inStock?: boolean };

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "bestselling", label: "Best selling" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];
const LIMIT = 12;

/** One-tap shortcuts for the same price / stock filters the sheet edits, so both stay in sync. */
const QUICK_FILTERS: {
  label: string;
  isOn: (f: Filters) => boolean;
  toggle: (f: Filters) => Filters;
}[] = [
  {
    label: "In stock",
    isOn: (f) => !!f.inStock,
    toggle: (f) => ({ ...f, inStock: f.inStock ? undefined : true }),
  },
  ...[500, 1000].map((limit) => ({
    label: `Under ${formatTaka(limit)}`,
    isOn: (f: Filters) => f.maxPrice === limit - 1 && f.minPrice === undefined,
    toggle: (f: Filters) =>
      f.maxPrice === limit - 1 && f.minPrice === undefined
        ? { ...f, maxPrice: undefined }
        : { ...f, minPrice: undefined, maxPrice: limit - 1 },
  })),
];

const toNumber = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Math.floor(Number(v))));
const countActive = (f: Filters) =>
  Number(f.minPrice !== undefined) + Number(f.maxPrice !== undefined) + Number(!!f.inStock);

function FilterForm({
  value,
  onApply,
  submitLabel,
  inline,
}: {
  value: Filters;
  onApply: (f: Filters) => void;
  submitLabel: string;
  inline?: boolean;
}) {
  const [min, setMin] = useState(value.minPrice?.toString() ?? "");
  const [max, setMax] = useState(value.maxPrice?.toString() ?? "");
  const [inStock, setInStock] = useState(!!value.inStock);

  const field = "h-12 w-full rounded-btn border border-ink-900/15 bg-white px-3 text-base md:h-11";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const minPrice = toNumber(min);
        const maxPrice = toNumber(max);
        // Swap instead of sending an invalid range the API would reject
        const swap = minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice;
        onApply({
          minPrice: swap ? maxPrice : minPrice,
          maxPrice: swap ? minPrice : maxPrice,
          inStock: inStock || undefined,
        });
      }}
      className={inline ? "flex flex-wrap items-end gap-3" : "space-y-4"}
    >
      <div className="flex items-end gap-2">
        <label className="block flex-1 text-base font-semibold">
          Min price (৳)
          <input
            className={field}
            inputMode="numeric"
            pattern="[0-9]*"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="block flex-1 text-base font-semibold">
          Max price (৳)
          <input
            className={field}
            inputMode="numeric"
            pattern="[0-9]*"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Any"
          />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-base font-semibold">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setInStock(e.target.checked)}
          className="size-6 accent-brand-600"
        />
        In stock only
      </label>
      <Button type="submit" className={inline ? "" : "w-full"}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** Sticky sort + filter bar, product grid and "Load more". Page 1 arrives pre-rendered from the server. */
export function CategoryBrowser({
  slug,
  initialItems,
  initialTotal,
}: {
  slug: string;
  initialItems: ProductCard[];
  initialTotal: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ProductSort>("newest");
  const [filters, setFilters] = useState<Filters>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const latest = useRef(0); // ignores responses from superseded requests

  async function load(next: { sort: ProductSort; filters: Filters; page: number }) {
    const request = ++latest.current;
    setLoading(true);
    setError(false);
    try {
      const res = await fetchCategoryProducts({
        category: slug,
        sort: next.sort,
        page: next.page,
        limit: LIMIT,
        ...next.filters,
      });
      if (request !== latest.current) return;
      setItems((prev) => {
        if (next.page === 1) return res.items;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
      });
      setTotal(res.total);
      setPage(next.page);
      setSort(next.sort);
      setFilters(next.filters);
    } catch {
      if (request === latest.current) setError(true);
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }

  const active = countActive(filters);
  const select =
    "h-12 rounded-btn border border-ink-900/15 bg-white px-3 text-base font-semibold md:h-11";
  const barButton =
    "flex h-11 flex-1 items-center justify-center gap-2 rounded-btn border border-line-strong bg-white text-copy font-semibold text-ink-900 transition motion-safe:active:-translate-y-px";
  const sortLabel = SORTS.find((s) => s.value === sort)?.label;

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 bg-surface px-4 py-2 md:top-[var(--header-h)] md:mx-0 md:rounded-card md:border md:border-ink-900/10 md:bg-surface/95 md:backdrop-blur">
        {/* Phones: Filter and Sort open bottom sheets */}
        <div className="flex gap-2 md:hidden">
          <button type="button" onClick={() => setSheetOpen(true)} className={barButton}>
            <SlidersHorizontal size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Filter
            {active > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.25 text-xs text-white">
                {active}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setSortOpen(true)} className={barButton}>
            <ArrowDownUp size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            {sortLabel}
          </button>
        </div>
        {/* md and up: sort select and inline filter form */}
        <div className="hidden items-center gap-2 md:flex">
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => load({ sort: e.target.value as ProductSort, filters, page: 1 })}
            className={select}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="ml-4">
            <FilterForm
              inline
              value={filters}
              submitLabel="Apply"
              onApply={(f) => load({ sort, filters: f, page: 1 })}
            />
          </div>
        </div>
      </div>

      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {QUICK_FILTERS.map((q) => {
          const on = q.isOn(filters);
          return (
            <li key={q.label} className="shrink-0">
              <button
                type="button"
                aria-pressed={on}
                disabled={loading}
                onClick={() => load({ sort, filters: q.toggle(filters), page: 1 })}
                className={cn(
                  "relative flex h-9.5 items-center gap-1.5 rounded-full border px-3.5 text-sm transition",
                  // 44 px hit area around the 38 px pill
                  "after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']",
                  on
                    ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
                    : "border-line-strong bg-white font-medium text-ink-700",
                )}
              >
                {on && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
                {q.label}
              </button>
            </li>
          );
        })}
      </ul>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        {sheetOpen && (
          <FilterForm
            value={filters}
            submitLabel="Show results"
            onApply={(f) => {
              setSheetOpen(false);
              void load({ sort, filters: f, page: 1 });
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        <ul className="-my-2">
          {SORTS.map((s) => (
            <li key={s.value}>
              <button
                type="button"
                aria-pressed={s.value === sort}
                onClick={() => {
                  setSortOpen(false);
                  if (s.value !== sort) void load({ sort: s.value, filters, page: 1 });
                }}
                className={cn(
                  "flex min-h-12 w-full items-center justify-between text-left text-base",
                  s.value === sort ? "font-semibold text-brand-600" : "font-medium",
                )}
              >
                {s.label}
                {s.value === sort && (
                  <Check size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <div className="space-y-4 pt-1" aria-busy={loading}>
        <p className="text-sm text-ink-500 tabular-nums" aria-live="polite">
          Showing {items.length} of {total}
        </p>

        {items.length > 0 ? (
          <ProductGrid products={items} quickAdd />
        ) : (
          !loading && (
            <p className="rounded-card bg-white p-6 text-base shadow-card">
              No products match these filters.
            </p>
          )
        )}

        {loading && (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-base text-danger">
            Could not load products. Please try again.
          </p>
        )}

        {total > 0 && (
          <div className="flex flex-col items-center gap-2.5 pt-2.5 md:pt-4">
            <div
              aria-hidden="true"
              className="h-1 w-full overflow-hidden rounded-full bg-line-track md:max-w-sm"
            >
              <div
                className="h-1 bg-brand-600 transition-[width]"
                style={{ width: `${Math.min(100, (items.length / total) * 100)}%` }}
              />
            </div>
            {items.length < total && (
              <Button
                variant="outline"
                className="w-full md:w-auto md:px-10"
                disabled={loading}
                onClick={() => load({ sort, filters, page: page + 1 })}
              >
                Load more
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
