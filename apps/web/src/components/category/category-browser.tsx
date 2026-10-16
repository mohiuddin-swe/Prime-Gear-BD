"use client";

import { useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { ProductCard, ProductSort } from "@primegear/shared";
import { Button } from "@primegear/ui/button";
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

  return (
    <div>
      <div className="sticky top-[var(--header-h)] z-20 -mx-4 border-b border-ink-900/10 bg-surface/95 px-4 py-2 backdrop-blur md:mx-0 md:rounded-card md:border md:px-4">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => load({ sort: e.target.value as ProductSort, filters, page: 1 })}
            className={`${select} min-w-0 flex-1 md:flex-none`}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => setSheetOpen(true)} className="md:hidden">
            <SlidersHorizontal size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Filters{active > 0 && ` (${active})`}
          </Button>
          <div className="hidden md:ml-4 md:block">
            <FilterForm
              inline
              value={filters}
              submitLabel="Apply"
              onApply={(f) => load({ sort, filters: f, page: 1 })}
            />
          </div>
        </div>
      </div>

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

      <div className="space-y-4 pt-4" aria-busy={loading}>
        <p className="text-base tabular-nums" aria-live="polite">
          {total} {total === 1 ? "product" : "products"}
        </p>

        {items.length > 0 ? (
          <ProductGrid products={items} />
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

        {items.length < total && (
          <Button
            variant="outline"
            className="w-full md:mx-auto md:w-auto md:px-10"
            disabled={loading}
            onClick={() => load({ sort, filters, page: page + 1 })}
          >
            Load more
          </Button>
        )}
      </div>
    </div>
  );
}
