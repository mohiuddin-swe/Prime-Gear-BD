import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCategories } from "@/lib/api";
import { categoryPath } from "@/lib/site";

export const revalidate = 300; // must be a literal for Next; matches REVALIDATE in lib/api

export const generateMetadata = async (): Promise<Metadata> => ({
  title: "All Categories | Prime Gear BD",
  description: "Browse every Prime Gear BD category.",
  alternates: { canonical: "/categories/" },
});

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-6 md:py-10">
      <h1 className="font-heading text-3xl font-extrabold">Categories</h1>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={categoryPath(c.slug)}
              className="block overflow-hidden rounded-card bg-white shadow-card"
            >
              <span className="relative block aspect-square bg-surface">
                {c.imageUrl && (
                  <Image
                    src={c.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-contain"
                  />
                )}
              </span>
              <span className="flex min-h-12 items-center px-3 text-base font-semibold">
                {c.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
