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

/** All text comes from props so it can be translated / edited from admin settings. */
export function TrustStrip({
  items,
  tone = "light",
  className,
}: {
  items: TrustItem[];
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
      {items.map((item) => {
        const Icon = icons[item.icon];
        return (
          <li
            key={item.title}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-card p-3",
              tone === "light" ? "bg-white shadow-card" : "bg-white/5 ring-1 ring-white/10",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-btn",
                tone === "light" ? "bg-brand-50 text-brand-600" : "bg-white/10 text-glow",
              )}
            >
              <Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-base font-semibold leading-5",
                  tone === "light" ? "text-ink-900" : "text-white",
                )}
              >
                {item.title}
              </span>
              {item.caption && (
                <span
                  className={cn(
                    "block text-sm leading-5",
                    tone === "light" ? "text-ink-900/70" : "text-slate-300",
                  )}
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
