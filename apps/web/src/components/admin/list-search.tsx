import { Search } from "lucide-react";
import { ICON_STROKE } from "@primegear/ui/icon";

/** GET search form for admin lists (no JS needed): submits ?q= to the same page. */
export function ListSearch({ value, placeholder, label }: { value: string; placeholder: string; label: string }) {
  return (
    <form role="search" className="md:w-80">
      <label className="flex h-12 items-center gap-2.5 rounded-btn border border-line-strong bg-white px-3.5 text-ink-500 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
        <Search size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
        <input
          type="search"
          name="q"
          defaultValue={value}
          placeholder={placeholder}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
        />
      </label>
    </form>
  );
}
