import type { MetadataRoute } from "next";
import type { CategoryNode } from "@primegear/shared";
import { getCategories, getProducts } from "@/lib/api";
import { abs, categoryPath, productPath } from "@/lib/site";

export const revalidate = 3600;

const flatten = (nodes: CategoryNode[]): CategoryNode[] =>
  nodes.flatMap((n) => [n, ...flatten(n.children)]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = flatten(await getCategories());

  const products: { slug: string }[] = [];
  for (let page = 1; ; page++) {
    const res = await getProducts({ page, limit: 100 });
    products.push(...res.items);
    if (res.items.length === 0 || products.length >= res.total) break;
  }

  return [
    { url: abs("/"), changeFrequency: "daily", priority: 1 },
    { url: abs("/categories/"), changeFrequency: "weekly", priority: 0.5 },
    ...categories.map((c) => ({
      url: abs(categoryPath(c.slug)),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: abs(productPath(p.slug)),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
