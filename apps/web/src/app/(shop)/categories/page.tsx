import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageCircle, X } from "lucide-react";
import { SearchField } from "@primegear/ui/header";
import { ICON_STROKE } from "@primegear/ui/icon";
import { ButtonLink } from "@primegear/ui/button";
import { SectionDark } from "@primegear/ui/section-dark";
import { getCategories } from "@/lib/api";
import { CategoryIcon } from "@/lib/category-icons";
import {
  FEATURED_CATEGORY_SLUG,
  SUPPORT_PHONE,
  categoryPath,
  supportPhoneDisplay,
  supportWhatsappHref,
} from "@/lib/site";

export const revalidate = 300; // must be a literal for Next; matches REVALIDATE in lib/api

export const generateMetadata = async (): Promise<Metadata> => ({
  title: "All Categories | Prime Gear BD",
  description: "Browse every Prime Gear BD category.",
  alternates: { canonical: "/categories/" },
});

/** Phones: the full-screen menu behind the header menu button. From md it is a plain category index. */
export default async function CategoriesPage() {
  const categories = await getCategories();
  const featured = categories.find((c) => c.slug === FEATURED_CATEGORY_SLUG) ?? categories[0];

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-72px)] max-w-7xl flex-col pb-4 md:min-h-0 md:pb-12">
      <div className="flex flex-col gap-3 bg-white px-4 pb-3.5 pt-2.5 shadow-hairline md:bg-transparent md:px-6 md:pt-8 md:shadow-none">
        <div className="flex items-center">
          <h1 className="flex-1 font-heading text-title font-extrabold tracking-display md:text-3xl">
            Shop by category
          </h1>
          <Link
            href="/"
            aria-label="Close menu"
            className="-mr-2.5 inline-flex size-11 items-center justify-center rounded-btn text-ink-900 active:bg-brand-50 md:hidden"
          >
            <X size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </Link>
        </div>
        <SearchField action="/search/" placeholder="Search all products" className="md:hidden" />
      </div>

      {featured && (
        <Link href={categoryPath(featured.slug)} className="mx-4 mt-3.5 md:mx-6 md:mt-4">
          <SectionDark
            card
            glow="warm"
            className="rounded-feature"
            contentClassName="flex items-center gap-3.5 !px-4 !py-4"
          >
            <span className="flex size-13 shrink-0 items-center justify-center rounded-tile bg-white/10 text-warm">
              <CategoryIcon slug={featured.slug} size={28} strokeWidth={ICON_STROKE} />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="font-heading text-lead font-bold">{featured.name}</span>
              <span className="text-caption text-mist-muted">Our bestselling category</span>
            </span>
            <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
          </SectionDark>
        </Link>
      )}

      <ul className="grid grid-cols-3 gap-2.5 px-4 pt-3.5 md:grid-cols-4 md:gap-4 md:px-6 xl:grid-cols-6">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={categoryPath(c.slug)}
              className="flex h-25 flex-col items-center justify-center gap-2 rounded-card bg-white px-1.5 py-2.5 shadow-card-soft transition motion-safe:active:-translate-y-px md:h-32"
            >
              <span className="flex size-10 items-center justify-center rounded-btn bg-brand-50 text-brand-600">
                <CategoryIcon slug={c.slug} size={22} strokeWidth={ICON_STROKE} />
              </span>
              <span className="text-center text-caption font-medium leading-label">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <div className="mx-4 mt-4 flex items-center gap-2.5 rounded-card bg-white p-3.5 shadow-card-soft md:mx-6 md:max-w-md">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-caption text-ink-500">Need help ordering?</span>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex min-h-11 items-center font-heading text-lead font-bold tabular-nums text-ink-900"
          >
            {supportPhoneDisplay}
          </a>
        </div>
        {supportWhatsappHref && (
          <ButtonLink
            href={supportWhatsappHref}
            className="h-11 gap-1.5 !rounded-btn bg-success px-3.5 text-copy text-white"
            variant="ghost"
          >
            <MessageCircle size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            WhatsApp
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
