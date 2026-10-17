import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { discountPercent } from "@primegear/shared/format";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { FeatureCards } from "@/components/product/feature-cards";
import { Gallery } from "@/components/product/gallery";
import { LightModes } from "@/components/product/light-modes";
import { ProductDetails } from "@/components/product/product-details";
import { ProductHeader, ProductShareActions } from "@/components/product/product-header";
import { ProductCardItem } from "@/components/product/product-grid";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { RatingLink, ReviewsSummary } from "@/components/product/reviews";
import { getProduct, isNotFound } from "@/lib/api";
import { JsonLd } from "@/lib/json-ld";
import { isVideoUrl } from "@/lib/media";
import { SITE_NAME, abs, categoryPath, productPath } from "@/lib/site";

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
  const photos = product.images.filter((i) => i.kind !== "DARK_ROOM");
  const darkShots = product.images.filter((i) => i.kind === "DARK_ROOM");
  const url = abs(path);

  return (
    <>
      <ProductHeader
        slug={product.slug}
        name={product.name}
        url={url}
        backHref={product.category ? categoryPath(product.category.slug) : "/"}
        backLabel={product.category ? `Back to ${product.category.name}` : "Back to home"}
        title={product.category?.name ?? SITE_NAME}
      />

      {/* Phones: full-bleed sections with their own 16 px margins, room at the bottom for the order bar */}
      <div className="mx-auto max-w-7xl pb-36 md:px-6 md:pb-12 md:pt-2">
        {/* Visible from md; on phones the header shows the category. The BreadcrumbList JSON-LD
            inside is rendered either way (display: none doesn't remove it from the HTML). */}
        <div className="hidden items-center justify-between gap-4 md:flex">
          <Breadcrumbs crumbs={crumbs} />
          <ProductShareActions slug={product.slug} name={product.name} url={url} />
        </div>

        <div className="md:mt-4 md:grid md:grid-cols-2 md:items-start md:gap-10">
          <div className="md:sticky md:top-24">
            <Gallery
              media={photos}
              darkMedia={darkShots}
              name={product.name}
              discountPercent={discountPercent(product.price, product.comparePrice)}
            />
          </div>

          <div className="md:flex md:flex-col md:gap-6">
            <div>
              <PurchasePanel
                productId={product.id}
                name={product.name}
                url={url}
                variants={product.variants}
                bulkTiers={product.bulkTiers}
                header={
                  <>
                    <h1 className="font-heading text-title font-bold tracking-heading md:text-3xl">
                      {product.name}
                    </h1>
                    {product.subtitle && (
                      <p className="-mt-1 text-copy text-ink-500">{product.subtitle}</p>
                    )}
                    <RatingLink reviews={product.reviews} />
                  </>
                }
              />
            </div>
            <FeatureCards features={product.features} />
            <LightModes modes={product.lightModes} />
            <ProductDetails product={product} />
          </div>
        </div>

        <div className="md:mt-6">
          <ReviewsSummary reviews={product.reviews} />
        </div>

        {product.relatedProducts.length > 0 && (
          <section aria-labelledby="related" className="flex flex-col gap-3 pt-6 md:pt-10">
            <h2 id="related" className="px-4 font-heading text-lg font-bold md:px-0 md:text-xl">
              You may also like
            </h2>
            <ul className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
              {product.relatedProducts.slice(0, 8).map((p) => (
                <li key={p.id} className="flex shrink-0 basis-37.5 md:basis-auto">
                  <ProductCardItem
                    product={p}
                    variant="mini"
                    className="w-full"
                    sizes="(min-width: 1280px) 300px, (min-width: 768px) 25vw, 130px"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

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
    </>
  );
}
