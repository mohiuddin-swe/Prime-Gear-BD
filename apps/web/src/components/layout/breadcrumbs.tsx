import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@primegear/ui";
import { JsonLd } from "@/lib/json-ld";
import { abs } from "@/lib/site";

export type Crumb = { name: string; path: string };

/** Visible breadcrumb trail plus matching BreadcrumbList JSON-LD. The last crumb is the current page. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center overflow-x-auto whitespace-nowrap text-base [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center">
              {i > 0 && (
                <ChevronRight
                  size={16}
                  strokeWidth={ICON_STROKE}
                  className="mx-1"
                  aria-hidden="true"
                />
              )}
              {i < crumbs.length - 1 ? (
                <Link href={c.path} className="flex min-h-11 items-center text-brand-600">
                  {c.name}
                </Link>
              ) : (
                <span aria-current="page" className="font-semibold">
                  {c.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: abs(c.path),
          })),
        }}
      />
    </>
  );
}
