import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
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

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pb-8 pt-2 md:px-6 md:pb-12">
      <Breadcrumbs crumbs={crumbs} />
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-extrabold">{category.name}</h1>
        {category.description && <p className="max-w-2xl text-base">{category.description}</p>}
        {category.children.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
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
      </header>
      <CategoryBrowser slug={slug} initialItems={first.items} initialTotal={first.total} />
    </div>
  );
}
