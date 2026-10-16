import Link from "next/link";
import { Package, Zap, type LucideIcon } from "lucide-react";
import type { CategoryNode } from "@primegear/shared";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { categoryPath } from "@/lib/site";
import { SectionHeading } from "./section-heading";

type Tile = { key: string; name: string; href: string; Icon: LucideIcon; deal?: boolean };

/** "Shop by category": a row of 84 px icon tiles that scrolls sideways on phones. */
export function CategoryChips({
  categories,
  offersHref,
}: {
  categories: Pick<CategoryNode, "id" | "name" | "slug">[];
  /** Adds the amber "Offers" tile (points at the flash sale while one is live) */
  offersHref?: string;
}) {
  const tiles: Tile[] = categories.map((c) => ({
    key: c.id,
    name: c.name,
    href: categoryPath(c.slug),
    Icon: CATEGORY_ICONS[c.slug] ?? Package,
  }));
  if (offersHref) tiles.push({ key: "offers", name: "Offers", href: offersHref, Icon: Zap, deal: true });

  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-3 pt-6 md:pt-10">
      <SectionHeading
        id="home-categories"
        title="Shop by category"
        href="/categories/"
        className="px-4 md:px-6"
      />
      <ul className="flex gap-2.5 overflow-x-auto px-4 pb-1.5 scrollbar-none md:px-6 [&::-webkit-scrollbar]:hidden">
        {tiles.map(({ key, name, href, Icon, deal }) => (
          <li key={key} className="w-21 shrink-0 md:w-28">
            <Link
              href={href}
              className="flex h-full flex-col items-center gap-2 rounded-card bg-white px-1 py-3 text-ink-900 shadow-card transition motion-safe:active:-translate-y-px"
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-tile",
                  deal ? "bg-deal-soft text-deal-deep" : "bg-brand-50 text-brand-600",
                )}
              >
                <Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </span>
              <span className="text-center text-caption font-medium leading-tight">{name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
