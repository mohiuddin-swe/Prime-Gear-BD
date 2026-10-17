import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, SectionDark } from "@primegear/ui/section-dark";
import { notFound } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { CategoryBrowser } from "@/components/category/category-browser";
import { getCategory, getProducts, isNotFound } from "@/lib/api";
import { SITE_NAME, abs, categoryPath } from "@/lib/site";

export const revalidate = 300; // must be a literal for Next; matches REVALIDATE in lib/api

// Pages are generated on first request, then cached and revalidated every 5 minutes (ISR).
// Returning [] avoids needing the API during `next build`.
export const generateStaticParams = () => [];

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await getCategory(slug);
  } catch (err) {
    if (isNotFound(err)) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await load((await params).slug);
  const title = category.seoTitle ?? `${category.name} Price in Bangladesh | ${SITE_NAME}`;
  const description =
    category.seoDescription ?? category.description ?? `Shop ${category.name} at ${SITE_NAME}.`;
  const path = categoryPath(category.slug);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: abs(path),
      images: category.imageUrl ? [{ url: category.imageUrl, alt: category.name }] : undefined,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const slug = (await params).slug;
  const category = await load(slug);
  const first = await getProducts({ category: slug, sort: "newest", page: 1, limit: 12 });

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    ...category.ancestors.map((a) => ({ name: a.name, path: categoryPath(a.slug) })),
    { name: category.name, path: categoryPath(category.slug) },
  ];

  const parent = category.ancestors.at(-1);

  return (
    <>
      <MobilePageHeader
        backHref={parent ? categoryPath(parent.slug) : "/categories/"}
        backLabel={parent ? `Back to ${parent.name}` : "Back to categories"}
        title={category.name}
      />
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-2 md:space-y-4 md:px-6 md:pb-12">
        <div className="hidden md:block">
          <Breadcrumbs crumbs={crumbs} />
        </div>
        <h1 className="hidden font-heading text-3xl font-extrabold md:block">{category.name}</h1>

        <SectionDark
          card
          glow="banner"
          contentClassName="relative flex min-h-33 flex-col justify-center gap-1.5"
        >
          <Eyebrow>
            {first.total} {first.total === 1 ? "PRODUCT" : "PRODUCTS"}
          </Eyebrow>
          <p className="max-w-52.5 font-heading text-title font-extrabold leading-display tracking-display line-clamp-3 md:max-w-xl md:text-3xl">
            {category.description ?? category.name}
          </p>
        </SectionDark>

        {category.children.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-3 md:pt-0">
            {category.children.map((c) => (
              <li key={c.id}>
                <Link
                  href={categoryPath(c.slug)}
                  className="inline-flex h-11 items-center rounded-full bg-white px-5 text-base font-semibold shadow-card"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <CategoryBrowser slug={slug} initialItems={first.items} initialTotal={first.total} />
      </div>
    </>
  );
}
