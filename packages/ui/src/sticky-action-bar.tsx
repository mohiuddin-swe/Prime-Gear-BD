import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { formatTaka } from "@primegear/shared/format";
import { cn } from "./cn";
import { ICON_STROKE } from "./icon";

export type StickyActionBarProps = {
  /** Small line above the total: "2 pieces", "Total" */
  label: string;
  total: number;
  /** md = 20 px total (product page), lg = 22 px (checkout) */
  totalSize?: "md" | "lg";
  /** Icon-only secondary action, e.g. add to cart (52 px square outline) */
  secondary?: ReactNode;
  /**
   * The main action: a size="lg" Button / ButtonLink (it gets the remaining width).
   * Next to a `secondary` it is trimmed to 52 px so both buttons line up.
   */
  children: ReactNode;
  /** Optional line under the row, e.g. <WhatsAppOrderLink /> */
  footer?: ReactNode;
  /** fixed = pinned to the viewport bottom (default); static = in the flow (demos, tests) */
  position?: "fixed" | "static";
  className?: string;
};

/**
 * Pinned order bar: total on the left, actions on the right, optional footer link.
 * Product page: `secondary` = add to cart, `children` = Order now, `footer` = WhatsApp.
 * Checkout: no secondary, `children` = Place order.
 */
export function StickyActionBar({
  label,
  total,
  totalSize = "md",
  secondary,
  children,
  footer,
  position = "fixed",
  className,
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col border-t border-line bg-white px-4 pt-2.5 shadow-bar",
        // The footer link carries its own 12 px of padding (44 px tap target), so the bar's
        // bottom padding shrinks by the same amount and the text sits where the mockup puts it
        footer
          ? "pb-[max(2px,env(safe-area-inset-bottom))]"
          : "pb-[max(14px,env(safe-area-inset-bottom))]",
        position === "fixed" && "fixed inset-x-0 bottom-0 z-30",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center [&>:last-child]:flex-1",
          secondary ? "gap-2.5 [&>:last-child]:h-13" : "gap-3",
        )}
      >
        <div className={cn("flex flex-col", secondary && "min-w-23")}>
          <span className="text-caption text-ink-500">{label}</span>
          <span
            className={cn(
              "font-heading font-extrabold tabular-nums text-ink-900",
              totalSize === "lg" ? "text-title" : "text-xl",
            )}
          >
            {formatTaka(total)}
          </span>
        </div>
        {secondary}
        {children}
      </div>
      {footer}
    </div>
  );
}

/** "Or order on WhatsApp": green text link for the bar footer, 44 px tall for the tap target. */
export function WhatsAppOrderLink({
  href,
  children = "Or order on WhatsApp",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-success-ink"
    >
      <MessageCircle size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
      {children}
    </a>
  );
}
