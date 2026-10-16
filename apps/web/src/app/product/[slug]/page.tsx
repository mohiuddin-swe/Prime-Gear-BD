import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrustStrip } from "@primegear/ui";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Gallery } from "@/components/product/gallery";
import { HowItWorks } from "@/components/product/how-it-works";
import { ProductGrid } from "@/components/product/product-grid";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { SpecAccordions } from "@/components/product/spec-accordions";
import { getProduct, isNotFound } from "@/lib/api";
import { JsonLd } from "@/lib/json-ld";
import { isVideoUrl } from "@/lib/media";
import { SITE_NAME, abs, categoryPath, productPath } from "@/lib/site";
import { trustItems } from "@/lib/trust";

export const revalidate = 300; // must be a literal for Next; matches REVALIDATE in lib/api

// Pages are generated on first request, then cached and revalidated every 5 minutes (ISR).
// Returning [] avoids needing the API during `next build`.
export const generateStaticParams = () => [];

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await getProduct(slug);
  } catch (err) {
    if (isNotFound(err)) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await load((await params).slug);
  const title = product.seoTitle ?? `${product.name} | ${SITE_NAME}`;
  const description = product.seoDescription ?? product.shortDescription ?? undefined;
  const path = productPath(product.slug);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: abs(path),
      images: product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await load((await params).slug);
  const path = productPath(product.slug);

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    ...(product.category
      ? [{ name: product.category.name, path: categoryPath(product.category.slug) }]
      : []),
    { name: product.name, path },
  ];

  const stillImages = product.images.filter((i) => !isVideoUrl(i.url)).map((i) => i.url);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-24 pt-2 md:space-y-12 md:px-6 md:pb-12">
      <Breadcrumbs crumbs={crumbs} />

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <Gallery media={product.images} name={product.name} />
        <div className="space-y-5">
          <h1 className="font-heading text-2xl font-extrabold leading-tight md:text-3xl">
            {product.name}
          </h1>
          {product.shortDescription && <p className="text-base">{product.shortDescription}</p>}
          <PurchasePanel variants={product.variants} bulkTiers={product.bulkTiers} />
        </div>
      </div>

      <TrustStrip items={trustItems} />
      <HowItWorks />
      <SpecAccordions product={product} />

      {product.relatedProducts.length > 0 && (
        <section aria-labelledby="related" className="space-y-3">
          <h2 id="related" className="font-heading text-xl font-bold">
            You may also like
          </h2>
          <ProductGrid products={product.relatedProducts.slice(0, 4)} />
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.shortDescription ?? product.description ?? undefined,
          image: stillImages.length ? stillImages : undefined,
          sku: (product.variants.find((v) => v.isDefault) ?? product.variants[0])?.sku,
          brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
          category: product.category?.name,
          url: abs(path),
          offers: product.variants.map((v) => ({
            "@type": "Offer",
            sku: v.sku,
            name: v.name,
            url: abs(path),
            price: v.price,
            priceCurrency: "BDT",
            availability: `https://schema.org/${v.stock > 0 ? "InStock" : "OutOfStock"}`,
            itemCondition: "https://schema.org/NewCondition",
          })),
        }}
      />
    </div>
  );
}
