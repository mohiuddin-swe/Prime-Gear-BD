"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@primegear/ui/cn";
import { ICON_STROKE } from "@primegear/ui/icon";
import { isVideoUrl } from "@/lib/media";

export type GalleryMedia = {
  id: string;
  url: string;
  alt: string | null;
  kind: "STANDARD" | "DARK_ROOM";
};

/** Swipeable (CSS scroll-snap) gallery. Only the first image is `priority`; video loads on demand. */
export function Gallery({ media, name }: { media: GalleryMedia[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  if (media.length === 0) {
    return <div className="aspect-square rounded-card bg-surface" aria-hidden="true" />;
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-card bg-surface">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={`${name} photos`}
        >
          {media.map((m, i) => (
            <div key={m.id} className="relative aspect-square w-full shrink-0 snap-center">
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
                  preload={i === 0}
                  fetchPriority={i === 0 ? "high" : undefined}
                  sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
                  className="object-contain"
                />
              )}
              {m.kind === "DARK_ROOM" && (
                <span className="absolute bottom-2 left-2 rounded-btn bg-ink-950 px-2 py-1 text-sm font-semibold text-white">
                  In a dark room
                </span>
              )}
            </div>
          ))}
        </div>
        {media.length > 1 && (
          <span
            aria-live="polite"
            className="absolute bottom-2 right-2 rounded-btn bg-ink-950/80 px-2 py-1 text-sm font-semibold tabular-nums text-white"
          >
            {index + 1} / {media.length}
          </span>
        )}
      </div>

      {media.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {media.map((m, i) => (
            <li key={m.id} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${isVideoUrl(m.url) ? "video" : "photo"} ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative flex size-14 items-center justify-center overflow-hidden rounded-btn border-2 bg-surface",
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
    </div>
  );
}
