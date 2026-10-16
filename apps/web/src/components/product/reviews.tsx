import type { ProductDetail } from "@primegear/shared";
import { cn } from "@primegear/ui/cn";

type Reviews = ProductDetail["reviews"];

/** Five ★ glyphs, filled up to the rounded rating. Decorative: callers state the number in text. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span aria-hidden="true" className={cn("tracking-[1px]", className)}>
      <span className="text-deal">{"★".repeat(filled)}</span>
      <span className="text-line-strong">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

const reviewCount = (n: number) => `${n} ${n === 1 ? "review" : "reviews"}`;

/** "★★★★★ 5.0 · 6 reviews" under the title; jumps to the reviews section. Hidden with no reviews. */
export function RatingLink({ reviews }: { reviews: Reviews }) {
  if (reviews.count === 0) return null;
  return (
    <a href="#reviews" className="flex min-h-11 items-center gap-1.5 self-start text-sm text-ink-700 -my-2">
      <Stars rating={reviews.average} />
      <span className="font-semibold tabular-nums">{reviews.average.toFixed(1)}</span>
      <span className="text-ink-500">· {reviewCount(reviews.count)}</span>
      <span className="sr-only"> out of 5. Read reviews</span>
    </a>
  );
}

/** Score, stars and the latest published reviews. Hidden with no reviews. */
export function ReviewsSummary({ reviews }: { reviews: Reviews }) {
  if (reviews.count === 0) return null;
  return (
    <section
      id="reviews"
      aria-labelledby="reviews-title"
      className="mx-4 mt-4 flex scroll-mt-4 flex-col gap-3 rounded-panel bg-white p-4 shadow-card md:mx-0 md:mt-0 md:p-6"
    >
      <h2 id="reviews-title" className="font-heading text-lg font-bold">
        Reviews ({reviews.count})
      </h2>
      <div className="flex items-center gap-3">
        <span className="font-heading text-4xl font-extrabold tabular-nums">
          {reviews.average.toFixed(1)}
          <span className="sr-only"> out of 5</span>
        </span>
        <div className="flex flex-col gap-0.5">
          <Stars rating={reviews.average} className="tracking-[2px]" />
          <span className="text-caption text-ink-500">
            {reviews.allVerified ? "From verified buyers" : `From ${reviewCount(reviews.count)}`}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-2 md:grid md:grid-cols-3">
        {reviews.latest.map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5 rounded-btn bg-surface p-3">
            <p className="text-sm font-semibold">
              {r.name}
              {r.district && <span className="font-normal text-ink-500"> · {r.district}</span>}
              <span className="sr-only">, rated {r.rating} out of 5</span>
            </p>
            <p className="text-sm leading-body text-ink-700">{r.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
