import type { Metadata } from "next";
import { TrustStrip } from "@primegear/ui";
import { CategoryChips } from "@/components/home/category-chips";
import { FlashSale } from "@/components/home/flash-sale";
import { Hero } from "@/components/home/hero";
import { SectionHeading } from "@/components/home/section-heading";
import { ProductGrid } from "@/components/product/product-grid";
import { getCategories, getProduct, getProducts } from "@/lib/api";
import { JsonLd } from "@/lib/json-ld";
import { SITE_NAME, abs, categoryPath } from "@/lib/site";
import { trustItems } from "@/lib/trust";

export const revalidate = 300; // must be a literal for Next; matches REVALIDATE in lib/api

const isFuture = (iso?: string) => !!iso && new Date(iso).getTime() > Date.now();

const description =
  "Smart home, LED lighting, electronics and gadgets in Bangladesh. Genuine products, cash on delivery.";

export const generateMetadata = async (): Promise<Metadata> => ({
  title: `${SITE_NAME} | Smart Home, LED Lighting & Gadgets in Bangladesh`,
  description,
  alternates: { canonical: "/" },
  openGraph: { type: "website", title: SITE_NAME, description, url: abs("/") },
});

export default async function HomePage() {
  const [categories, bestsellers, newest, pool] = await Promise.all([
    getCategories(),
    getProducts({ sort: "bestselling", limit: 8 }),
    getProducts({ sort: "newest", limit: 8 }),
    getProducts({ sort: "newest", limit: 60 }), // candidates for the flash-sale strip and hero
  ]);

  // Flash sale: discounted products, only while an end time is configured and still in the future
  const endsAt = process.env.FLASH_SALE_ENDS_AT;
  const saleLive = isFuture(endsAt);
  const onSale = pool.items.filter((p) => p.comparePrice !== null).slice(0, 10);

  // Hero: a featured product, preferring its real dark-room shot
  const heroProduct = pool.items.find((p) => p.isFeatured) ?? bestsellers.items[0];
  const heroDetail = heroProduct ? await getProduct(heroProduct.slug) : null;
  const heroImage =
    heroDetail?.images.find((i) => i.kind === "DARK_ROOM")?.url ?? heroProduct?.imageUrl ?? null;

  return (
    <>
      <Hero
        imageUrl={heroImage}
        imageAlt={heroProduct?.name ?? SITE_NAME}
        ctaHref={categories[0] ? categoryPath(categories[0].slug) : "/categories/"}
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:space-y-12 md:px-6 md:py-10">
        <CategoryChips categories={categories} />
      </div>
      {saleLive && endsAt && onSale.length > 0 && <FlashSale products={onSale} endsAt={endsAt} />}
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:space-y-12 md:px-6 md:py-12">
        {bestsellers.items.length > 0 && (
          <section aria-label="Bestsellers">
            <SectionHeading title="Bestsellers" />
            <ProductGrid products={bestsellers.items} />
          </section>
        )}
        {newest.items.length > 0 && (
          <section aria-label="New arrivals">
            <SectionHeading title="New arrivals" />
            <ProductGrid products={newest.items} />
          </section>
        )}
        <TrustStrip items={trustItems} />
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: abs("/"),
          potentialAction: {
            "@type": "SearchAction",
            target: abs("/search/?q={search_term_string}"),
            "query-input": "required name=search_term_string",
          },
        }}
      />
    </>
  );
}
