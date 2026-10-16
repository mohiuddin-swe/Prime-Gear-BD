"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@primegear/ui/cn";
import { DiscountBadge } from "@primegear/ui/discount-badge";
import { ICON_STROKE } from "@primegear/ui/icon";
import { isVideoUrl } from "@/lib/media";

export type GalleryMedia = {
  id: string;
  url: string;
  alt: string | null;
};

type View = "photos" | "lit";

const views: { id: View; label: string }[] = [
  { id: "photos", label: "Product photos" },
  { id: "lit", label: "See it lit up" },
];

/**
 * Swipeable (CSS scroll-snap) gallery. Lighting products with a dark-room shot get a
 * "Product photos / See it lit up" toggle that swaps in the dark-room media.
 * Only the first product image is `priority`; video loads on demand.
 */
export function Gallery({
  media,
  darkMedia,
  name,
  discountPercent,
}: {
  media: GalleryMedia[];
  /** DARK_ROOM images: real light output. Empty = no toggle. */
  darkMedia: GalleryMedia[];
  name: string;
  discountPercent: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("photos");
  const [index, setIndex] = useState(0);

  const lit = view === "lit" && darkMedia.length > 0;
  const shown = lit ? darkMedia : media;

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  const pick = (v: View) => {
    setView(v);
    setIndex(0);
  };

  return (
    <section aria-label="Product photos" className="flex flex-col gap-3 bg-white pb-3 md:bg-transparent">
      <div
        className={cn(
          "relative aspect-[39/37] overflow-hidden md:aspect-square md:rounded-card",
          lit ? "bg-ink-950" : "bg-surface-sunken",
        )}
      >
        {shown.length > 0 && (
          <div
            // A fresh track per view so the scroll position starts at the first image
            key={view}
            ref={track}
            onScroll={(e) => {
              const el = e.currentTarget;
              setIndex(Math.round(el.scrollLeft / el.clientWidth));
            }}
            className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={lit ? `${name} lit up in a dark room` : `${name} photos`}
          >
            {shown.map((m, i) => (
              <div key={m.id} className="relative h-full w-full shrink-0 snap-center">
                {isVideoUrl(m.url) ? (
                  <video
                    controls
                    playsInline
                    preload="none"
                    aria-label={m.alt ?? `${name} video`}
                    className="h-full w-full object-contain"
                  >
                    <source src={m.url} />
                  </video>
                ) : (
                  <Image
                    src={m.url}
                    alt={m.alt ?? name}
                    fill
                    preload={!lit && i === 0}
                    fetchPriority={!lit && i === 0 ? "high" : undefined}
                    sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
                    className={lit ? "object-cover" : "object-contain"}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {!lit && (
          <DiscountBadge percent={discountPercent} size="lg" className="absolute left-3.5 top-3.5" />
        )}
        {lit && shown[index]?.alt && (
          <span className="absolute bottom-3.5 left-3.5 rounded-lg bg-white/12 px-2.5 py-1.25 text-xs font-semibold text-mist-pale">
            {shown[index]?.alt}
          </span>
        )}
        {shown.length > 1 && (
          <span
            aria-live="polite"
            className="absolute bottom-3.5 right-3.5 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
          >
            {index + 1} / {shown.length}
          </span>
        )}
      </div>

      {darkMedia.length > 0 && (
        <div role="group" aria-label="Photo view" className="flex gap-2 px-4 md:px-0">
          {views.map((v) => {
            const on = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={on}
                onClick={() => pick(v.id)}
                className={cn(
                  // 40 px visual, the pseudo-element grows the hit area to 44 px
                  "relative h-10 rounded-control border px-3.5 text-sm transition after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                  on
                    ? "border-brand-600 bg-brand-50 font-semibold text-brand-800"
                    : "border-line-strong bg-white font-medium text-ink-700",
                )}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Thumbnails from md up; phones swipe and read the counter */}
      {shown.length > 1 && (
        <ul className="hidden gap-2 overflow-x-auto [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
          {shown.map((m, i) => (
            <li key={m.id} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${isVideoUrl(m.url) ? "video" : "photo"} ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative flex size-14 items-center justify-center overflow-hidden rounded-btn border-2",
                  lit ? "bg-ink-950" : "bg-surface-sunken",
                  i === index ? "border-brand-600" : "border-transparent",
                )}
              >
                {isVideoUrl(m.url) ? (
                  <Play
                    size={24}
                    strokeWidth={ICON_STROKE}
                    className="text-brand-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Image src={m.url} alt="" fill sizes="56px" className="object-contain" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
