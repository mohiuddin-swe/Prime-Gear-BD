import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { searchProducts } from "@/lib/api";
import { buttonClasses } from "@primegear/ui";

// The query string makes this page dynamic; API responses are still cached for 5 minutes
export const revalidate = 300; // must be a literal for Next; matches REVALIDATE in lib/api

const PAGE_SIZE = 20;
type Props = { searchParams: Promise<{ q?: string; page?: string }> };

const parse = async (searchParams: Props["searchParams"]) => {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  return { q, page };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await parse(searchParams);
  return {
    title: q ? `Search results for "${q}" | Prime Gear BD` : "Search | Prime Gear BD",
    alternates: { canonical: "/search/" },
    robots: { index: false, follow: true }, // thin, infinite-URL pages stay out of the index
    openGraph: { title: q ? `Search: ${q}` : "Search", url: "/search/" },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, page } = await parse(searchParams);
  const result = q ? await searchProducts(q, page, PAGE_SIZE) : null;
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const href = (p: number) => `/search/?q=${encodeURIComponent(q)}&page=${p}`;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-6 md:py-10">
      <h1 className="font-heading text-3xl font-extrabold">
        {q ? `Results for "${q}"` : "Search"}
      </h1>
      {!result && <p className="text-base">Type something in the search box to find products.</p>}
      {result && (
        <>
          <p className="text-base tabular-nums">
            {result.total} {result.total === 1 ? "product" : "products"}
          </p>
          {result.items.length > 0 ? (
            <ProductGrid products={result.items} />
          ) : (
            <p className="rounded-card bg-white p-6 text-base shadow-card">
              Nothing found. Try a different word, or browse a category.
            </p>
          )}
          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
              {page > 1 ? (
                <Link href={href(page - 1)} className={buttonClasses("outline")}>
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-base tabular-nums">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={href(page + 1)} className={buttonClasses("outline")}>
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
