import { Headphones, Lightbulb, Package, Plug, Wifi, type LucideIcon } from "lucide-react";

// Icons for the store's main categories; anything else gets the generic box
// TODO: move to a per-category icon field in admin
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "led-lighting": Lightbulb,
  "smart-home": Wifi,
  gadgets: Headphones,
  accessories: Plug,
};

/** Category icon by slug (generic box for anything unmapped). */
export function CategoryIcon({
  slug,
  size,
  strokeWidth,
}: {
  slug: string;
  size: number;
  strokeWidth: number;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? Package;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
