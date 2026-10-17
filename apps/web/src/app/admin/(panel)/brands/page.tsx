import type { Metadata } from "next";
import type { AdminBrand } from "@primegear/shared";
import { BrandManager } from "@/components/admin/brand-manager";
import { ListSearch } from "@/components/admin/list-search";
import { PageTitle, Pagination } from "@/components/admin/ui";
import { adminGet, toQuery } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Brands" };

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const { data: brands, meta } = await adminGet<AdminBrand[]>(
    `/admin/brands${toQuery({ limit: "50", ...params }, ["q", "page", "limit"])}`,
  );

  return (
    <>
      <PageTitle title="Brands" description={`${meta?.total ?? brands.length} brands`} />
      <ListSearch value={q} placeholder="Search brands" label="Search brands" />
      <BrandManager brands={brands} filtered={!!q} />
      {meta && (
        <Pagination
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          href={(page) => `/admin/brands/${toQuery({ q, page: page > 1 ? String(page) : undefined }, ["q", "page"])}`}
        />
      )}
    </>
  );
}
