import Link from "next/link";
import type { CategoryNode } from "@primegear/shared";
import { categoryPath } from "@/lib/site";

export function CategoryChips({
  categories,
}: {
  categories: Pick<CategoryNode, "id" | "name" | "slug">[];
}) {
  return (
    <nav aria-label="Categories">
      <ul className="-mx-4 flex scroll-px-4 snap-x gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <li key={c.id} className="shrink-0 snap-start">
            <Link
              href={categoryPath(c.slug)}
              className="inline-flex h-11 items-center rounded-full bg-white px-5 text-base font-semibold text-ink-900 shadow-card active:bg-brand-50"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
