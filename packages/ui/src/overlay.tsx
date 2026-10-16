"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";
import { ICON_STROKE } from "./icon";

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned below the scrolling body (totals, primary action) */
  footer?: ReactNode;
  className?: string;
  /** Muted text after the title, e.g. an item count */
  titleSuffix?: string;
  /** Pinned under the title row, above the scrolling body (e.g. a delivery progress bar) */
  headerExtra?: ReactNode;
};

/**
 * Native <dialog> gives focus trapping, Esc to close and inert background for free.
 * Used by BottomSheet and Drawer; locks page scroll while open.
 */
function Overlay({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  panelClassName,
  handle = false,
  titleSuffix,
  headerExtra,
  bodyClassName,
}: OverlayProps & { panelClassName: string; handle?: boolean; bodyClassName?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // tap on the backdrop
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink-950/60 motion-safe:backdrop:animate-fade-in",
        className,
      )}
    >
      <div className={cn("flex flex-col bg-white text-ink-900 shadow-sheet", panelClassName)}>
        {handle && (
          <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" />
        )}
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-2",
            !headerExtra && "border-b border-line",
          )}
        >
          <h2 id={titleId} className="font-heading text-lg font-bold">
            {title}
            {titleSuffix && <span className="font-semibold text-ink-500"> {titleSuffix}</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-11 items-center justify-center rounded-btn text-ink-900 active:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <X size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
        </div>
        {headerExtra && <div className="border-b border-line px-4 pb-3">{headerExtra}</div>}
        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-4", bodyClassName)}>
          {children}
        </div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </dialog>
  );
}

/** Mobile filters, variant pickers. Slides up from the bottom, full width. */
export function BottomSheet(props: OverlayProps) {
  return (
    <Overlay
      {...props}
      className={cn(
        "fixed inset-x-0 bottom-0 top-auto w-full motion-safe:open:animate-sheet-up",
        props.className,
      )}
      panelClassName="max-h-[85dvh] rounded-t-sheet pb-[env(safe-area-inset-bottom)] md:mx-auto md:max-w-lg"
      handle
    />
  );
}

/** Cart drawer. Slides in from the right: full width on phones, 420 px from md up. */
export function Drawer(props: OverlayProps) {
  return (
    <Overlay
      {...props}
      className={cn(
        "fixed inset-y-0 left-auto right-0 h-dvh w-full md:w-105 motion-safe:open:animate-drawer-in",
        props.className,
      )}
      panelClassName="h-dvh pb-[env(safe-area-inset-bottom)]"
    />
  );
}

/** Cart: a rounded bottom sheet on phones (92% tall), the right-hand drawer from md up. */
export function CartSheet(props: OverlayProps) {
  return (
    <Overlay
      {...props}
      className={cn(
        "fixed inset-x-0 bottom-0 top-auto w-full motion-safe:open:animate-sheet-up md:inset-y-0 md:left-auto md:right-0 md:w-105 md:motion-safe:open:animate-drawer-in",
        props.className,
      )}
      panelClassName="h-[92dvh] rounded-t-sheet pb-[env(safe-area-inset-bottom)] md:h-dvh md:rounded-none"
      bodyClassName="bg-surface"
      handle
    />
  );
}
