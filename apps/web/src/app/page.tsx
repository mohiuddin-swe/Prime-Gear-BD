import type { Metadata } from "next";
import { TrustStrip } from "@primegear/ui";
import { CategoryChips } from "@/components/home/category-chips";
import { FLASH_SALE_ID, FlashSale } from "@/components/home/flash-sale";
import { Hero } from "@/components/home/hero";
import { SectionHeading } from "@/components/home/section-heading";
import { SmartHomeBlock } from "@/components/home/smart-home-block";
import { ProductGrid } from "@/components/product/product-grid";
import { getCategories, getProduct, getProducts } from "@/lib/api";
import { JsonLd } from "@/lib/json-ld";
import { SITE_NAME, abs, categoryPath, productPath } from "@/lib/site";
import { homeTrustItems } from "@/lib/trust";

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
  const [categories, bestsellers, pool] = await Promise.all([
    getCategories(),
    getProducts({ sort: "bestselling", limit: 8 }),
    getProducts({ sort: "newest", limit: 60 }), // candidates for the flash-sale strip and hero
  ]);

  // Flash sale: discounted products, only while an end time is configured and still in the future
  const endsAt = process.env.FLASH_SALE_ENDS_AT;
  const saleLive = isFuture(endsAt);
  const onSale = pool.items.filter((p) => p.comparePrice !== null).slice(0, 10);
  const showSale = saleLive && !!endsAt && onSale.length > 0;

  // Hero: a featured product, preferring its real dark-room shot
  // TODO: replace with the hero product picked in admin settings
  const heroProduct = pool.items.find((p) => p.isFeatured) ?? bestsellers.items[0];
  const heroDetail = heroProduct ? await getProduct(heroProduct.slug) : null;
  const heroImage =
    heroDetail?.images.find((i) => i.kind === "DARK_ROOM")?.url ?? heroProduct?.imageUrl ?? null;
  const isBestseller = !!heroProduct && bestsellers.items.some((p) => p.id === heroProduct.id);

  const smartHome = categories.find((c) => c.slug === "smart-home");

  return (
    <div className="mx-auto max-w-7xl pb-7 md:pb-12">
      {!heroProduct && <h1 className="sr-only">{SITE_NAME}</h1>}
      {heroProduct && (
        <Hero
          product={{
            name: heroProduct.name,
            blurb: heroProduct.shortDescription,
            tag: [isBestseller ? "Bestseller" : "Featured", heroProduct.category?.name]
              .filter(Boolean)
              .join(" · "),
            price: heroProduct.price,
            compareAt: heroProduct.comparePrice,
            href: productPath(heroProduct.slug),
            imageUrl: heroImage,
          }}
        />
      )}

      {categories.length > 0 && (
        <CategoryChips
          categories={categories}
          offersHref={showSale ? `#${FLASH_SALE_ID}` : undefined}
        />
      )}

      {showSale && <FlashSale products={onSale} endsAt={endsAt} />}

      <TrustStrip items={homeTrustItems} className="mx-4 mt-4 md:mx-6 md:mt-8" />

      {bestsellers.items.length > 0 && (
        <section
          aria-labelledby="home-bestsellers"
          className="flex flex-col gap-3 px-4 pt-6 md:gap-4 md:px-6 md:pt-10"
        >
          <SectionHeading id="home-bestsellers" title="Bestsellers" href="/categories/" />
          <ProductGrid products={bestsellers.items} quickAdd />
        </section>
      )}

      <SmartHomeBlock href={smartHome ? categoryPath(smartHome.slug) : "/categories/"} />

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
    </div>
  );
}
