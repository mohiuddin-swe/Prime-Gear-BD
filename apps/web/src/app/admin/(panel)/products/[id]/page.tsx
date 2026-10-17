import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import type { AdminCatalogOptions, AdminProduct } from "@primegear/shared";
import { buttonClasses } from "@primegear/ui/button";
import { ICON_STROKE } from "@primegear/ui/icon";
import { ImageManager } from "@/components/admin/image-manager";
import { ProductForm } from "@/components/admin/product-form";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { UpsellManager } from "@/components/admin/upsell-manager";
import { adminGet } from "@/lib/admin-server";
import { isNotFound } from "@/lib/api";
import { productPath } from "@/lib/site";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  let product: AdminProduct;
  try {
    product = (await adminGet<AdminProduct>(`/admin/products/${encodeURIComponent(id)}`)).data;
  } catch (err) {
    if (isNotFound(err)) notFound();
    throw err;
  }
  const { data: options } = await adminGet<AdminCatalogOptions>("/admin/catalog-options");

  return (
    <>
      <PageTitle
        title={product.name}
        back={{ href: "/admin/products/", label: "Products" }}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge status={product.status} />
            {created && <span className="font-semibold text-success-ink">Product created. Add images next.</span>}
          </span>
        }
        actions={
          product.status === "ACTIVE" && (
            <a
              href={productPath(product.slug)}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "outline" }, "w-full md:w-auto")}
            >
              <ExternalLink size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              View in store
            </a>
          )
        }
      />
      <ProductForm product={product} options={options}>
        <ImageManager productId={product.id} initialImages={product.images} variants={product.variants} />
        <UpsellManager productId={product.id} />
      </ProductForm>
    </>
  );
}
