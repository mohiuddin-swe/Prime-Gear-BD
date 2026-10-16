"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "./cn";

export type SelectableVariant =
  | "tier" // bulk offer: label, unit price, saving; optional tag pill on the edge
  | "swatch" // light mode: glowing colour dot over a label
  | "option" // delivery area: title, "fee · eta"
  | "payment" // radio dot, title, sub-line, brand chip
  | "chip" // body colour: swatch dot + label in a 44 px button
  | "pill"; // filter chip: rounded, check when on

export type SelectableCardProps = {
  variant: SelectableVariant;
  selected: boolean;
  onSelect: () => void;
  /** "radio" for one-of-many groups (default). "toggle" for independent filters (aria-pressed). */
  mode?: "radio" | "toggle";
  title: ReactNode;
  /** tier: the unit price line */
  value?: ReactNode;
  /** tier: saving line · option: "fee · eta" · payment: sub-line */
  detail?: ReactNode;
  /** tier: "Most popular" pill straddling the top edge */
  tag?: ReactNode;
  /** swatch / chip: a CSS colour from data (the product's own colour, not a UI token) */
  swatch?: string;
  /** payment: brand chip on the right */
  chip?: { label: string; brand: "cod" | "bkash" | "nagad" | "rocket" };
  disabled?: boolean;
  className?: string;
};

const chipBrand = {
  cod: "bg-ink-950",
  bkash: "bg-pay-bkash",
  nagad: "bg-pay-nagad",
  rocket: "bg-pay-rocket",
} as const;

const base =
  "relative flex cursor-pointer select-none border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * One selectable tile for bulk tiers, light modes, delivery area, payment, colours and filters.
 * Selected = 2 px brand-600 border on brand-50; unselected = 1 px line-strong on white.
 * Put several inside <SelectableGroup> for radio semantics and arrow-key movement.
 */
export function SelectableCard({
  variant,
  selected,
  onSelect,
  mode = "radio",
  title,
  value,
  detail,
  tag,
  swatch,
  chip,
  disabled,
  className,
}: SelectableCardProps) {
  const on = selected;
  const shape = cn(
    variant === "tier" && "flex-col items-center gap-1 rounded-tile px-1.5 pb-3 pt-4",
    variant === "swatch" && "flex-col items-center gap-2 rounded-tile px-1.5 py-3",
    variant === "option" && "flex-col items-start gap-0.5 rounded-tile p-3",
    variant === "payment" && "min-h-15 items-center gap-3 rounded-tile px-3.5 py-2.5",
    variant === "chip" && "h-11 items-center gap-2 rounded-btn px-3.5",
    // pill: 38 px visual, the pseudo-element grows the hit area to 44 px
    variant === "pill" &&
      "h-9.5 shrink-0 items-center gap-1.5 rounded-full px-3.5 after:absolute after:inset-x-0 after:-inset-y-0.75 after:content-['']",
  );
  const state = on
    ? cn("border-2 border-brand-600 bg-brand-50", variant === "tier" && "shadow-selected")
    : "border-line-strong bg-white";
  // pill and chip have a thinner selected border in the mockups (1 px on pill)
  const pillOn = variant === "pill" && on ? "border border-brand-600" : "";

  const titleCls = cn(
    variant === "tier" && (on ? "text-copy font-bold text-ink-950" : "text-copy font-semibold text-ink-700"),
    variant === "swatch" && (on ? "text-sm font-semibold text-ink-950" : "text-sm font-medium text-ink-700"),
    variant === "option" && (on ? "text-copy font-semibold text-ink-950" : "text-copy font-semibold text-ink-700"),
    variant === "payment" && (on ? "text-copy font-semibold text-ink-950" : "text-copy font-semibold text-ink-700"),
    variant === "chip" && (on ? "text-copy font-semibold text-brand-800" : "text-copy font-medium text-ink-700"),
    variant === "pill" && (on ? "text-sm font-semibold text-brand-800" : "text-sm font-medium text-ink-700"),
  );
  const detailCls = on ? "text-brand-800" : "text-ink-500";

  const aria =
    mode === "radio"
      ? ({ role: "radio", "aria-checked": on } as const)
      : ({ "aria-pressed": on } as const);

  return (
    <button
      type="button"
      {...aria}
      disabled={disabled}
      onClick={onSelect}
      className={cn(base, shape, state, pillOn, className)}
    >
      {variant === "tier" && tag && (
        <span
          className={cn(
            "absolute -top-2.5 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold text-white",
            on ? "bg-brand-gradient" : "bg-ink-950",
          )}
        >
          {tag}
        </span>
      )}

      {variant === "payment" && (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-5.5 shrink-0 items-center justify-center rounded-full border-2",
            on ? "border-brand-600" : "border-line-stronger",
          )}
        >
          {on && <span className="size-2.5 rounded-full bg-brand-600" />}
        </span>
      )}

      {variant === "swatch" && (
        <span
          aria-hidden="true"
          style={{ backgroundColor: swatch, color: swatch }}
          className={cn("size-9 rounded-full", on ? "shadow-glow-sm" : "border border-line-track")}
        />
      )}
      {variant === "chip" && swatch && (
        <span
          aria-hidden="true"
          style={{ backgroundColor: swatch }}
          className="size-4.5 rounded-full border border-line-swatch"
        />
      )}
      {variant === "pill" && on && (
        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
      )}

      {variant === "payment" ? (
        <span className="flex flex-1 flex-col gap-0.5">
          <span className={titleCls}>{title}</span>
          {detail && <span className={cn("text-caption", detailCls)}>{detail}</span>}
        </span>
      ) : (
        <span className={titleCls}>{title}</span>
      )}

      {variant === "tier" && value && (
        <span
          className={cn(
            "font-heading text-base font-extrabold tabular-nums",
            on ? "text-ink-950" : "text-ink-900",
          )}
        >
          {value}
        </span>
      )}
      {(variant === "tier" || variant === "option") && detail && (
        <span
          className={cn(
            variant === "tier" ? cn("text-xs", on ? "font-semibold" : "font-medium") : "text-sm",
            detailCls,
          )}
        >
          {detail}
        </span>
      )}

      {variant === "payment" && chip && (
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs font-bold text-white",
            chipBrand[chip.brand],
          )}
        >
          {chip.label}
        </span>
      )}
    </button>
  );
}

/**
 * Radio group wrapper: role="radiogroup", Arrow keys move the selection like native radios.
 * `columns` lays the cards out in an equal-width grid; 1 stacks them (payment).
 */
export function SelectableGroup({
  label,
  columns,
  children,
  className,
}: {
  label: string;
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!next) return;
    const radios = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)') ?? [],
    );
    const current = radios.findIndex((r) => r === document.activeElement);
    if (current === -1) return;
    e.preventDefault();
    const target = radios[(current + next + radios.length) % radios.length];
    target?.focus();
    target?.click();
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        columns === 1 && "flex flex-col gap-2",
        columns === 2 && "grid grid-cols-2 gap-2.5",
        columns === 3 && "grid grid-cols-3 gap-2",
        !columns && "flex flex-wrap gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
