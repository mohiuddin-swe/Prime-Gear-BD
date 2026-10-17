import type { Metadata } from "next";
import type { AdminCatalogOptions } from "@primegear/shared";
import { ProductForm } from "@/components/admin/product-form";
import { PageTitle } from "@/components/admin/ui";
import { adminGet } from "@/lib/admin-server";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const { data: options } = await adminGet<AdminCatalogOptions>("/admin/catalog-options");
  return (
    <>
      <PageTitle
        title="New product"
        description="Images and upsell offers can be added after the first save."
        back={{ href: "/admin/products/", label: "Products" }}
      />
      <ProductForm product={null} options={options} />
    </>
  );
}
