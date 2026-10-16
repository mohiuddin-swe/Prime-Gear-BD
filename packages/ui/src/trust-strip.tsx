import { Banknote, MessageCircle, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { cn } from "./cn";
import { ICON_STROKE } from "./icon";

const icons = {
  cod: Banknote,
  delivery: Truck,
  warranty: ShieldCheck,
  whatsapp: MessageCircle,
} satisfies Record<string, LucideIcon>;

export type TrustItem = {
  icon: keyof typeof icons;
  title: string;
  caption?: string;
};

/**
 * All text comes from props so it can be translated / edited from admin settings.
 * strip (default): one white card, icon over label, equal columns (home page).
 * tiles: separate icon + text cards, 2 columns on mobile, 4 from md.
 */
export function TrustStrip({
  items,
  tone = "light",
  layout = "strip",
  label = "Why shop with us",
  className,
}: {
  items: TrustItem[];
  tone?: "light" | "dark";
  layout?: "strip" | "tiles";
  /** Accessible name of the list */
  label?: string;
  className?: string;
}) {
  const light = tone === "light";

  if (layout === "strip") {
    return (
      <ul
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        className={cn(
          "grid gap-1 rounded-card px-1.5 py-3.5",
          light ? "bg-white shadow-card" : "bg-white/5 ring-1 ring-white/10",
          className,
        )}
      >
        {items.map((item) => {
          const Icon = icons[item.icon];
          return (
            <li key={item.title} className="flex flex-col items-center gap-1.5 text-center">
              <Icon
                size={24}
                strokeWidth={ICON_STROKE}
                aria-hidden="true"
                className={light ? "text-brand-600" : "text-glow"}
              />
              <span
                className={cn(
                  "text-caption font-medium leading-label",
                  light ? "text-ink-900" : "text-white",
                )}
              >
                {item.title}
                {item.caption && (
                  <span className={cn("block font-normal", light ? "text-ink-500" : "text-mist")}>
                    {item.caption}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul aria-label={label} className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
      {items.map((item) => {
        const Icon = icons[item.icon];
        return (
          <li
            key={item.title}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-card p-3",
              light ? "bg-white shadow-card" : "bg-white/5 ring-1 ring-white/10",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-btn",
                light ? "bg-brand-50 text-brand-600" : "bg-white/10 text-glow",
              )}
            >
              <Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-copy font-semibold leading-5",
                  light ? "text-ink-900" : "text-white",
                )}
              >
                {item.title}
              </span>
              {item.caption && (
                <span
                  className={cn("block text-sm leading-5", light ? "text-ink-500" : "text-mist")}
                >
                  {item.caption}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
