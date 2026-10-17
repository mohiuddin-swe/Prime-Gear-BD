import type { Metadata } from "next";
import type { AdminCatalogOptions, AdminCategory } from "@primegear/shared";
import { CategoryManager } from "@/components/admin/category-manager";
import { ListSearch } from "@/components/admin/list-search";
import { PageTitle, Pagination } from "@/components/admin/ui";
import { adminGet, toQuery } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const [{ data: categories, meta }, { data: options }] = await Promise.all([
    adminGet<AdminCategory[]>(`/admin/categories${toQuery({ limit: "50", ...params }, ["q", "page", "limit"])}`),
    adminGet<AdminCatalogOptions>("/admin/catalog-options"),
  ]);

  return (
    <>
      <PageTitle title="Categories" description={`${meta?.total ?? categories.length} categories`} />
      <ListSearch value={q} placeholder="Search categories" label="Search categories" />
      <CategoryManager categories={categories} allCategories={options.categories} filtered={!!q} />
      {meta && (
        <Pagination
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          href={(page) => `/admin/categories/${toQuery({ q, page: page > 1 ? String(page) : undefined }, ["q", "page"])}`}
        />
      )}
    </>
  );
}
