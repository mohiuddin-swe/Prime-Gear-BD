"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { ICON_STROKE } from "./icon";

export type AccordionItem = {
  id: string;
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
};

/**
 * One white panel (20 px radius) with 56 px section headers separated by hairlines.
 * Several sections can be open at once (specs + what's in the box). Pass `single` to allow one.
 */
export function Accordion({
  items,
  single = false,
  className,
}: {
  items: AccordionItem[];
  single?: boolean;
  className?: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState<string[]>(() =>
    items.filter((i) => i.defaultOpen).map((i) => i.id),
  );

  const toggle = (id: string) =>
    setOpen((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : single ? [id] : [...cur, id],
    );

  return (
    <div className={cn("overflow-hidden rounded-panel bg-white shadow-card", className)}>
      {items.map((item, i) => {
        const isOpen = open.includes(item.id);
        const panelId = `${uid}-${item.id}-panel`;
        const buttonId = `${uid}-${item.id}-button`;
        return (
          <section key={item.id} className={cn(i > 0 && "border-t border-surface-sunken")}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex h-14 w-full items-center justify-between px-4 text-left font-heading text-base font-bold text-ink-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600"
              >
                {item.title}
                <ChevronDown
                  size={20}
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                  className={cn("transition-transform duration-200", isOpen && "rotate-180")}
                />
              </button>
            </h3>
            {/* grid-rows 0fr -> 1fr animates height; inert keeps collapsed content out of the tab order */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">{item.content}</div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
