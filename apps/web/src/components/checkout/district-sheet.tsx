"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import type { ShippingZone } from "@primegear/shared";
import { BD_DISTRICTS, shippingZoneForDistrict } from "@primegear/shared/districts";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { BottomSheet } from "@primegear/ui/overlay";

const SORTED = [...BD_DISTRICTS].sort((a, b) => a.localeCompare(b));

/** Searchable list of the districts in a bottom sheet: all 64, or one delivery zone's. */
export function DistrictSheet({
  open,
  onClose,
  value,
  onSelect,
  zone,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (district: string) => void;
  /** Only list the districts in this zone (picked from the delivery-area cards) */
  zone?: ShippingZone;
}) {
  const [query, setQuery] = useState("");
  const all = useMemo(
    () => (zone ? SORTED.filter((d) => shippingZoneForDistrict(d) === zone) : SORTED),
    [zone],
  );
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((d) => d.toLowerCase().includes(q)) : all;
  }, [query, all]);

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={close} title="Select your district">
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 bg-white px-4 pb-3 pt-4">
        <label htmlFor="district-search" className="sr-only">
          Search districts
        </label>
        <div className="relative">
          <Search
            size={20}
            strokeWidth={ICON_STROKE}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/70"
          />
          <input
            id="district-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search district"
            className="h-12 w-full rounded-btn border border-ink-900/15 bg-surface pl-10 pr-3 text-base"
          />
        </div>
        <p className="pt-2 text-sm tabular-nums" aria-live="polite">
          {results.length} of {all.length} districts
        </p>
      </div>

      {results.length === 0 ? (
        <p className="py-6 text-center text-base">No district matches “{query}”.</p>
      ) : (
        <ul role="listbox" aria-label="Districts" className="-mx-1">
          {results.map((d) => {
            const selected = d === value;
            return (
              <li key={d} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(d);
                    close();
                  }}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-between rounded-btn px-3 text-left text-base",
                    selected ? "bg-brand-50 font-semibold text-brand-600" : "active:bg-brand-50",
                  )}
                >
                  {d}
                  {selected && <Check size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}
