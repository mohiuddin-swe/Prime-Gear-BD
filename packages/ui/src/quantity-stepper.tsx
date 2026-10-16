"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "./cn";

export type QuantityStepperProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Product name, for screen readers: "Quantity of LED lamp" */
  label?: string;
  className?: string;
};

// 40 px visual button; the pseudo-element grows the hit area to 44 px
const stepBtn =
  "relative flex size-10 items-center justify-center bg-white text-ink-900 transition after:absolute after:-inset-0.5 after:content-[''] active:bg-brand-50 disabled:cursor-not-allowed disabled:text-ink-400 disabled:opacity-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600";

/** − 1 + control: 10 px radius, 1 px line-strong border, 40 px buttons, tabular count. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  label = "Quantity",
  className,
}: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-control border border-line-strong bg-white",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(stepBtn, "rounded-l-control")}
      >
        <Minus size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <output
        aria-live="polite"
        className="w-8 text-center text-copy font-semibold tabular-nums text-ink-900"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(stepBtn, "rounded-r-control")}
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
